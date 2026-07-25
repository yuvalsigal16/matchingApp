using System.Diagnostics;
using System.Globalization;
using System.Text;
using System.Text.Json;
using MatchingAppServer.Models;
using Microsoft.Extensions.Caching.Memory;

namespace MatchingAppServer.Services
{
    /// <summary>
    /// העשרת פעילויות מסלול מול Google Places (New) — אחריות יחידה: אימות מקומות
    /// והוספת מידע אמיתי (דירוג, תמונה, ניווט). אין כאן לוגיקת Claude/טיולים/יומן.
    /// Typed HttpClient באותו דפוס כמו Brevo/AiItinerary; ללא מפתח מוגדר — כבוי לחלוטין.
    /// כשל בכל רמה לעולם לא מפיל את המסלול — במקרה הגרוע הפעילות נשארת לא-מועשרת.
    /// </summary>
    public class PlaceEnrichmentService
    {
        private readonly HttpClient _http;
        private readonly IConfiguration _config;
        private readonly IMemoryCache _cache;

        private const int MaxParallel = 5;            // קריאות Google במקביל
        private const int OverallBudgetSeconds = 12;  // תקציב-על להעשרה כולה
        private const int PlaceCacheDays = 7;         // TTL של מקום ב-cache
        private const double WalkSpeedKmh = 4.5;      // מהירות הליכה ממוצעת להערכת זמן
        private const double StreetFactor = 1.25;     // Haversine (קו אווירי) → מרחק רחוב משוער
        private const double CompactKm = 0.7;         // סף "מרחק הליכה" בין פעילויות עוקבות

        // רשומת cache. גם "לא נמצא"/"נכשל אימות" נשמר (Data=null) כדי לא לחפש שוב
        // ב-regenerate; כשל תקשורת/מכסה לא נשמר — ננסה שוב בפעם הבאה.
        private sealed class CachedPlace
        {
            public PlaceData? Data { get; set; }
        }

        private sealed class PlaceData
        {
            public string Id = "";
            public string Name = "";
            public double Lat;
            public double Lng;
            public double? Rating;
            public int? RatingCount;
            public string? PhotoUrl;
            public string MapsUrl = "";
            public string? Type;
        }

        // עוגן היעד: מרכז ה-locationBias וסף המרחק לאימות (null = יעד ברמת מדינה, בלי סף).
        private sealed class DestinationAnchor
        {
            public double Lat;
            public double Lng;
            public double? MaxDistanceKm;
        }

        private sealed class Counters
        {
            public int Requested;
            public int Matched;
            public int Failed;
            public int Skipped;
            public int CacheHits;
            public int Photos;
        }

        public PlaceEnrichmentService(HttpClient http, IConfiguration config, IMemoryCache cache)
        {
            _http = http;
            _config = config;
            _cache = cache;
        }

        private string? ApiKey
        {
            get
            {
                var key = _config["GooglePlaces:ApiKey"];
                if (string.IsNullOrEmpty(key) || key == "YOUR_GOOGLE_PLACES_API_KEY_HERE")
                    return null;
                return key;
            }
        }

        /// <summary>
        /// מעשיר את המסלול in-place: place לכל פעילות שאומתה, dayNavUrl + insights לכל יום,
        /// ו-trust ברמת המסלול. ct = ביטול הבקשה מהלקוח; תקציב הזמן הפנימי (12 שנ')
        /// מחזיר העשרה חלקית ולא שגיאה.
        /// </summary>
        public async Task EnrichAsync(AiItineraryResponse itinerary, int tripId, string destination, CancellationToken ct)
        {
            if (ApiKey == null)
                return; // אין מפתח — המסלול חוזר בדיוק כמו היום

            var sw = Stopwatch.StartNew();
            var counters = new Counters();

            using var budget = CancellationTokenSource.CreateLinkedTokenSource(ct);
            budget.CancelAfter(TimeSpan.FromSeconds(OverallBudgetSeconds));

            try
            {
                var anchor = await GetDestinationAnchorAsync(destination, budget.Token);

                // דה-דופליקציה: כל שאילתה ייחודית → קריאת Google אחת, גם אם המקום חוזר.
                var byQuery = new Dictionary<string, List<AiItineraryActivity>>();
                foreach (var day in itinerary.Days)
                {
                    foreach (var act in day.Activities)
                    {
                        var q = NormalizeQuery(act.PlaceQuery);
                        if (q.Length == 0)
                        {
                            counters.Skipped++;
                            continue;
                        }
                        counters.Requested++;
                        if (!byQuery.TryGetValue(q, out var list))
                            byQuery[q] = list = new List<AiItineraryActivity>();
                        list.Add(act);
                    }
                }

                if (byQuery.Count > 0)
                {
                    // בלי using: אחרי ביטול-תקציב ייתכנו משימות בטיסה שעוד מחזיקות את
                    // הסמפור — Dispose היה גורם ל-Release על אובייקט מושמד.
                    // SemaphoreSlim בלי AvailableWaitHandle אינו דורש Dispose.
                    var semaphore = new SemaphoreSlim(MaxParallel);
                    var tasks = byQuery.Select(kv =>
                        ProcessQueryAsync(kv.Key, kv.Value, anchor, semaphore, counters, budget.Token));
                    try
                    {
                        await Task.WhenAll(tasks);
                    }
                    catch (OperationCanceledException) when (!ct.IsCancellationRequested)
                    {
                        // תקציב הזמן נגמר — ממשיכים עם מה שהספיק להסתיים (העשרה חלקית).
                    }
                }

                ComputeDayArtifacts(itinerary);
                ComputeTrust(itinerary, counters);

                Console.WriteLine(
                    $"[AiItinerary] trip={tripId} enrich: requested={counters.Requested} matched={counters.Matched} " +
                    $"failed={counters.Failed} skipped={counters.Skipped} cacheHits={counters.CacheHits} " +
                    $"photos={counters.Photos} in {sw.ElapsedMilliseconds}ms");
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                throw; // הלקוח ביטל את הבקשה — אין טעם להמשיך
            }
            catch (Exception ex)
            {
                // ההעשרה לעולם לא מפילה יצירת מסלול.
                Console.WriteLine($"[AiItinerary] trip={tripId} enrich failed after {sw.ElapsedMilliseconds}ms: {ex.Message}");
            }
        }

        // ─────────────────────────── חיפוש ואימות מקום ───────────────────────────

        // שאילתה אחת: cache → Google → ולידציה → השמה לכל הפעילויות שחולקות אותה.
        // WaitAsync מחוץ ל-try בכוונה: Release רץ אך ורק אחרי Acquire מוצלח.
        private async Task ProcessQueryAsync(
            string query, List<AiItineraryActivity> activities, DestinationAnchor? anchor,
            SemaphoreSlim semaphore, Counters counters, CancellationToken ct)
        {
            string cacheKey = $"place_{query}";

            if (_cache.TryGetValue(cacheKey, out CachedPlace? cached) && cached != null)
            {
                Interlocked.Increment(ref counters.CacheHits);
                Assign(activities, cached.Data, counters);
                return;
            }

            await semaphore.WaitAsync(ct);
            try
            {
                var (data, cacheable) = await SearchAndValidateAsync(query, anchor, counters, ct);
                if (cacheable)
                    _cache.Set(cacheKey, new CachedPlace { Data = data }, TimeSpan.FromDays(PlaceCacheDays));
                Assign(activities, data, counters);
            }
            catch (OperationCanceledException)
            {
                throw; // תקציב/ביטול — מטופל למעלה
            }
            catch (Exception)
            {
                // כשל בשאילתה בודדת לא עוצר את השאר.
                Interlocked.Add(ref counters.Failed, activities.Count);
            }
            finally
            {
                semaphore.Release();
            }
        }

        private static void Assign(List<AiItineraryActivity> activities, PlaceData? data, Counters counters)
        {
            if (data == null)
            {
                Interlocked.Add(ref counters.Failed, activities.Count);
                return;
            }
            foreach (var act in activities)
                act.Place = BuildActivityPlace(data);
            Interlocked.Add(ref counters.Matched, activities.Count);
        }

        // מחזיר (מקום, האם לשמור ב-cache). "לא נמצא"/"רחוק מדי" נשמר כשלילי;
        // שגיאת HTTP/מכסה לא נשמרת — ננסה שוב בפעם הבאה.
        private async Task<(PlaceData?, bool)> SearchAndValidateAsync(
            string query, DestinationAnchor? anchor, Counters counters, CancellationToken ct)
        {
            var place = await TextSearchAsync(query, anchor, ct);
            if (place == null)
                return (null, true); // ZERO_RESULTS — אין טעם לחפש שוב שבוע

            // ולידציית מרחק: תוצאה רחוקה מדי מהיעד = כנראה מקום שגוי. עדיף כלום משגוי.
            if (anchor?.MaxDistanceKm != null &&
                HaversineKm(anchor.Lat, anchor.Lng, place.Lat, place.Lng) > anchor.MaxDistanceKm.Value)
                return (null, true);

            // תמונה: קריאה שנייה שמחזירה URL זמני ללא מפתח (skipHttpRedirect).
            // כשל תמונה אינו קריטי — המקום נשאר בלי תמונה.
            place.PhotoUrl = await ResolvePhotoAsync(place.PhotoUrl, ct);
            if (place.PhotoUrl != null)
                Interlocked.Increment(ref counters.Photos);

            return (place, true);
        }

        // Text Search של Places API (New). מחזיר את התוצאה הראשונה או null.
        // בשלב זה PhotoUrl מכיל את שם משאב-התמונה (photos[0].name) — נפתר בהמשך ל-URL.
        private async Task<PlaceData?> TextSearchAsync(string query, DestinationAnchor? anchor, CancellationToken ct)
        {
            var body = new Dictionary<string, object>
            {
                ["textQuery"] = query,
                ["languageCode"] = "he",
                ["pageSize"] = 1,
            };
            if (anchor != null)
            {
                body["locationBias"] = new Dictionary<string, object>
                {
                    ["circle"] = new Dictionary<string, object>
                    {
                        ["center"] = new Dictionary<string, object>
                        {
                            ["latitude"] = anchor.Lat,
                            ["longitude"] = anchor.Lng,
                        },
                        ["radius"] = 50000.0, // המקסימום המותר ל-bias
                    },
                };
            }

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://places.googleapis.com/v1/places:searchText");
            req.Headers.Add("X-Goog-Api-Key", ApiKey);
            req.Headers.Add("X-Goog-FieldMask",
                "places.id,places.displayName,places.location,places.rating,places.userRatingCount," +
                "places.googleMapsUri,places.primaryType,places.photos");
            req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req, ct);
            var text = await res.Content.ReadAsStringAsync(ct);
            if (!res.IsSuccessStatusCode)
                throw new HttpRequestException($"Places search {(int)res.StatusCode}");

            using var doc = JsonDocument.Parse(text);
            if (!doc.RootElement.TryGetProperty("places", out var places) || places.GetArrayLength() == 0)
                return null;

            var p = places[0];
            var data = new PlaceData
            {
                Id = p.GetProperty("id").GetString() ?? "",
                Name = p.TryGetProperty("displayName", out var dn) && dn.TryGetProperty("text", out var dt)
                    ? dt.GetString() ?? "" : "",
                MapsUrl = p.TryGetProperty("googleMapsUri", out var gm) ? gm.GetString() ?? "" : "",
                Type = p.TryGetProperty("primaryType", out var pt) ? pt.GetString() : null,
            };

            if (!p.TryGetProperty("location", out var loc) ||
                !loc.TryGetProperty("latitude", out var lat) || !loc.TryGetProperty("longitude", out var lng))
                return null; // בלי קואורדינטות אין אימות ואין ניווט — לא שווה הצגה

            data.Lat = lat.GetDouble();
            data.Lng = lng.GetDouble();

            if (p.TryGetProperty("rating", out var r) && r.ValueKind == JsonValueKind.Number)
                data.Rating = Math.Round(r.GetDouble(), 1);
            if (p.TryGetProperty("userRatingCount", out var rc) && rc.ValueKind == JsonValueKind.Number)
                data.RatingCount = rc.GetInt32();
            if (p.TryGetProperty("photos", out var ph) && ph.GetArrayLength() > 0 &&
                ph[0].TryGetProperty("name", out var pn))
                data.PhotoUrl = pn.GetString(); // שם משאב זמני — יומר ל-URL ב-ResolvePhotoAsync

            return data;
        }

        // ממיר שם משאב-תמונה ל-URL הגשה זמני מ-googleusercontent, ללא מפתח ה-API בתוכו.
        private async Task<string?> ResolvePhotoAsync(string? photoName, CancellationToken ct)
        {
            if (string.IsNullOrEmpty(photoName))
                return null;
            try
            {
                var url = $"https://places.googleapis.com/v1/{photoName}/media?maxHeightPx=400&skipHttpRedirect=true";
                using var req = new HttpRequestMessage(HttpMethod.Get, url);
                req.Headers.Add("X-Goog-Api-Key", ApiKey);

                var res = await _http.SendAsync(req, ct);
                if (!res.IsSuccessStatusCode)
                    return null;

                using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
                return doc.RootElement.TryGetProperty("photoUri", out var uri) ? uri.GetString() : null;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                return null;
            }
        }

        // מאתר את היעד עצמו — מרכז ה-bias וסף המרחק נגזרים מסוג היעד:
        // עיר ≈ 60 ק"מ, מחוז ≈ 300 ק"מ, מדינה — בלי סף. כשל = ממשיכים בלי עוגן.
        private async Task<DestinationAnchor?> GetDestinationAnchorAsync(string destination, CancellationToken ct)
        {
            var norm = NormalizeQuery(destination);
            if (norm.Length == 0)
                return null;

            string cacheKey = $"place_anchor_{norm}";
            if (_cache.TryGetValue(cacheKey, out DestinationAnchor? cachedAnchor))
                return cachedAnchor;

            try
            {
                var body = new Dictionary<string, object>
                {
                    ["textQuery"] = destination,
                    ["languageCode"] = "he",
                    ["pageSize"] = 1,
                };
                using var req = new HttpRequestMessage(HttpMethod.Post, "https://places.googleapis.com/v1/places:searchText");
                req.Headers.Add("X-Goog-Api-Key", ApiKey);
                req.Headers.Add("X-Goog-FieldMask", "places.location,places.types");
                req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

                var res = await _http.SendAsync(req, ct);
                if (!res.IsSuccessStatusCode)
                    return null;

                using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync(ct));
                if (!doc.RootElement.TryGetProperty("places", out var places) || places.GetArrayLength() == 0)
                    return null;

                var p = places[0];
                if (!p.TryGetProperty("location", out var loc))
                    return null;

                var types = new List<string>();
                if (p.TryGetProperty("types", out var t))
                    foreach (var el in t.EnumerateArray())
                        types.Add(el.GetString() ?? "");

                double? maxKm = 60;
                if (types.Contains("country"))
                    maxKm = null;
                else if (types.Any(x => x.StartsWith("administrative_area")))
                    maxKm = 300;

                var anchor = new DestinationAnchor
                {
                    Lat = loc.GetProperty("latitude").GetDouble(),
                    Lng = loc.GetProperty("longitude").GetDouble(),
                    MaxDistanceKm = maxKm,
                };
                _cache.Set(cacheKey, anchor, TimeSpan.FromDays(PlaceCacheDays));
                return anchor;
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch
            {
                return null; // בלי עוגן: החיפוש עדיין עובד (השאילתה כוללת עיר), רק בלי bias וסף
            }
        }

        // ─────────────────────────── נגזרות יום ומסלול ───────────────────────────

        // dayNavUrl (ניווט עם waypoints בסדר שתוכנן) + DailyInsights מקואורדינטות בלבד.
        private static void ComputeDayArtifacts(AiItineraryResponse itinerary)
        {
            foreach (var day in itinerary.Days)
            {
                var located = day.Activities.Where(a => a.Place != null).ToList();
                if (located.Count >= 2)
                {
                    // מסלול יומי פנימי: origin = העצירה הראשונה של היום (לא המיקום הנוכחי),
                    // יעד = האחרונה, ותחנות-הביניים באמצע — כך כל המסלול נשאר בתוך היעד.
                    var first = located[0].Place!;
                    var last = located[^1].Place!;
                    var waypoints = string.Join("|",
                        located.Skip(1).Take(located.Count - 2).Select(a => Coord(a.Place!)));
                    day.DayNavUrl =
                        "https://www.google.com/maps/dir/?api=1" +
                        $"&origin={Coord(first)}" +
                        $"&destination={Coord(last)}" +
                        (waypoints.Length > 0 ? $"&waypoints={Uri.EscapeDataString(waypoints)}" : "");
                }

                day.Insights = ComputeInsights(day);
            }
        }

        private static DailyInsights? ComputeInsights(AiItineraryDay day)
        {
            // מרחקים בין פעילויות עוקבות שלשתיהן יש מיקום מאומת.
            var pairDistances = new List<double>();
            for (int i = 0; i < day.Activities.Count - 1; i++)
            {
                var a = day.Activities[i].Place;
                var b = day.Activities[i + 1].Place;
                if (a != null && b != null)
                    pairDistances.Add(HaversineKm(a.Lat, a.Lng, b.Lat, b.Lng));
            }

            // מציגים רק כשרוב רצפי-היום מדידים — אחרת המספר מטעה. בלי נתונים: כלום.
            int gaps = Math.Max(day.Activities.Count - 1, 1);
            if (pairDistances.Count == 0 || pairDistances.Count * 2 < gaps)
                return null;

            double walkKm = Math.Round(pairDistances.Sum() * StreetFactor, 1);
            var insights = new DailyInsights
            {
                WalkKm = walkKm,
                WalkMinutes = (int)Math.Round(walkKm / WalkSpeedKmh * 60),
                IsCompact = pairDistances.Count >= 2 &&
                            pairDistances.OrderBy(d => d).ElementAt(pairDistances.Count / 2) < CompactKm,
            };

            // משך יום משוער מהשעות שה-AI קבע (לא דורש קואורדינטות, אבל מוצג רק יחד איתן).
            if (day.Activities.Count >= 2 &&
                TimeSpan.TryParse(day.Activities[0].Time, out var first) &&
                TimeSpan.TryParse(day.Activities[^1].Time, out var lastT) &&
                lastT > first)
                insights.ActiveHours = Math.Round((lastT - first).TotalHours, 1);

            return insights;
        }

        // "אמינות המסלול": מוצג רק כשאומתו לפחות 3 מקומות ולפחות מחצית מהמועמדים.
        // verified/candidates נשלחים ללקוח לצורכי debugging/analytics בלבד — לא לתצוגה.
        private static void ComputeTrust(AiItineraryResponse itinerary, Counters counters)
        {
            var verified = itinerary.Days
                .SelectMany(d => d.Activities)
                .Where(a => a.Place != null)
                .Select(a => a.Place!)
                .ToList();

            int candidates = counters.Requested;
            if (verified.Count < 3 || candidates == 0 || verified.Count * 2 < candidates)
                return;

            // מקומות כפולים נספרים פעם אחת בממוצע ובסך המדרגים.
            var distinct = verified.GroupBy(p => p.MapsUrl).Select(g => g.First())
                .Where(p => p.Rating.HasValue).ToList();
            if (distinct.Count == 0)
                return;

            itinerary.Trust = new ItineraryTrust
            {
                AvgRating = Math.Round(distinct.Average(p => p.Rating!.Value), 1),
                TotalRatings = distinct.Sum(p => p.RatingCount ?? 0),
                VerifiedPlaces = verified.Count,
                TotalCandidatePlaces = candidates,
            };
        }

        // ─────────────────────────── עזרים ───────────────────────────

        private static ActivityPlace BuildActivityPlace(PlaceData data)
        {
            return new ActivityPlace
            {
                Name = data.Name,
                Rating = data.Rating,
                RatingCount = data.RatingCount,
                PhotoUrl = data.PhotoUrl,
                MapsUrl = data.MapsUrl,
                // מקום בודד: פתיחת המקום במפה (סיכה) — לא ניווט מהמיקום הנוכחי.
                // לפני הטיול המשתמש בארץ; route ליעד בחו"ל ייצר מסלול חוצה-גבולות מיותר.
                NavUrl =
                    "https://www.google.com/maps/search/?api=1" +
                    $"&query={CoordValue(data.Lat)},{CoordValue(data.Lng)}" +
                    $"&query_place_id={Uri.EscapeDataString(data.Id)}",
                Lat = data.Lat,
                Lng = data.Lng,
                Type = data.Type,
            };
        }

        // קואורדינטות תמיד ב-InvariantCulture — תרבות שרת עם פסיק עשרוני תשבור URL.
        private static string CoordValue(double v) => v.ToString("0.######", CultureInfo.InvariantCulture);
        private static string Coord(ActivityPlace p) => $"{CoordValue(p.Lat)},{CoordValue(p.Lng)}";

        private static string NormalizeQuery(string? q)
        {
            if (string.IsNullOrWhiteSpace(q))
                return "";
            return string.Join(" ", q.Trim().ToLowerInvariant()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries));
        }

        private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
        {
            const double R = 6371;
            double dLat = (lat2 - lat1) * Math.PI / 180;
            double dLng = (lng2 - lng1) * Math.PI / 180;
            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(lat1 * Math.PI / 180) * Math.Cos(lat2 * Math.PI / 180) *
                       Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
            return 2 * R * Math.Asin(Math.Sqrt(a));
        }
    }
}
