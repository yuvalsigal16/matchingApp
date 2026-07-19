using System.Text.Json.Serialization;

namespace MatchingAppServer.Models
{
    // מבנה התשובה של "המסלול שלכם" (הצעת מסלול מותאמת לשני המטיילים).
    // שמות ה-JSON תואמים 1:1 לסכמה שנשלחת למודל (Structured Output) —
    // אותם שמות גם יוצאים ללקוח, כך שאין שכבת תרגום באמצע.
    public class AiItineraryResponse
    {
        [JsonPropertyName("summary")]
        public string Summary { get; set; } = "";

        // למה המסלול מתאים לשני המטיילים — לפי המשותף ביניהם.
        [JsonPropertyName("match_reason")]
        public string MatchReason { get; set; } = "";

        // איך אוזנו ההעדפות השונות של שני המטיילים בבניית המסלול.
        [JsonPropertyName("planning_notes")]
        public string PlanningNotes { get; set; } = "";

        [JsonPropertyName("days")]
        public List<AiItineraryDay> Days { get; set; } = new();

        // מחושב בשרת מדירוגי המקומות שאומתו ב-Google — לא מגיע מהמודל.
        // null = אין מספיק אימותים להצגה (לפחות 3 מקומות ולפחות 50% הצלחה).
        [JsonPropertyName("trust")]
        public ItineraryTrust? Trust { get; set; }
    }

    public class AiItineraryDay
    {
        [JsonPropertyName("day")]
        public int Day { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        [JsonPropertyName("activities")]
        public List<AiItineraryActivity> Activities { get; set; } = new();

        // קישור ניווט לכל היום (waypoints בסדר שתוכנן) — נבנה בשרת; null כשאין
        // לפחות שני מקומות מאומתים ביום.
        [JsonPropertyName("dayNavUrl")]
        public string? DayNavUrl { get; set; }

        // תובנות יומיות המחושבות מקואורדינטות בלבד (ללא AI) — null כשאין מספיק נתונים.
        [JsonPropertyName("insights")]
        public DailyInsights? Insights { get; set; }
    }

    public class AiItineraryActivity
    {
        [JsonPropertyName("time")]
        public string Time { get; set; } = "";

        [JsonPropertyName("title")]
        public string Title { get; set; } = "";

        [JsonPropertyName("description")]
        public string Description { get; set; } = "";

        // שאילתת החיפוש שה-AI יצר — נתון פנימי של תהליך ההעשרה בלבד, לא נשלח ללקוח.
        // ריק = המודל לא בטוח שזה מקום ספציפי, ולא מבצעים חיפוש כלל.
        [JsonIgnore]
        public string PlaceQuery { get; set; } = "";

        // קליטה בלבד מתשובת המודל: ל-property אין getter ולכן System.Text.Json
        // משתמש בו בדה-סריאליזציה בלבד ולעולם לא מסדרר אותו החוצה ללקוח.
        [JsonPropertyName("place_query")]
        public string PlaceQueryFromModel { set => PlaceQuery = value; }

        // מגיע מהמודל: נימוק הבחירה על בסיס העדפות המטיילים. ריק = אין נימוק אמיתי, מוסתר.
        [JsonPropertyName("why")]
        public string Why { get; set; } = "";

        // תוצאת ההעשרה מ-Google Places — null כשלא נמצא/לא אומת; הפעילות מוצגת כרגיל.
        [JsonPropertyName("place")]
        public ActivityPlace? Place { get; set; }
    }

    // מקום מאומת ב-Google Places. בכוונה בלי כתובת/שעות/אתר/טלפון — רעש;
    // הכול נמצא בהקשה אחת דרך קישורי המפות.
    public class ActivityPlace
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = "";

        [JsonPropertyName("rating")]
        public double? Rating { get; set; }

        [JsonPropertyName("ratingCount")]
        public int? RatingCount { get; set; }

        [JsonPropertyName("photoUrl")]
        public string? PhotoUrl { get; set; }

        [JsonPropertyName("mapsUrl")]
        public string MapsUrl { get; set; } = "";

        // ניווט ישיר (navigation intent) מהמיקום הנוכחי אל המקום.
        [JsonPropertyName("navUrl")]
        public string NavUrl { get; set; } = "";

        [JsonPropertyName("lat")]
        public double Lat { get; set; }

        [JsonPropertyName("lng")]
        public double Lng { get; set; }

        // primaryType גולמי מגוגל (למשל "museum") — הלקוח ממפה לאייקון.
        [JsonPropertyName("type")]
        public string? Type { get; set; }
    }

    // "אמינות המסלול" — ממוצע דירוגים וסך המדרגים של המקומות שאומתו.
    // נתוני האימות (verified/candidates) נשלחים לצורכי debugging/analytics —
    // ה-UI מציג רק דירוג ממוצע ומספר דירוגים, לא "X מתוך Y".
    public class ItineraryTrust
    {
        [JsonPropertyName("avgRating")]
        public double AvgRating { get; set; }

        [JsonPropertyName("totalRatings")]
        public int TotalRatings { get; set; }

        [JsonPropertyName("verifiedPlaces")]
        public int VerifiedPlaces { get; set; }

        [JsonPropertyName("totalCandidatePlaces")]
        public int TotalCandidatePlaces { get; set; }
    }

    public class DailyInsights
    {
        [JsonPropertyName("walkKm")]
        public double? WalkKm { get; set; }

        [JsonPropertyName("walkMinutes")]
        public int? WalkMinutes { get; set; }

        [JsonPropertyName("activeHours")]
        public double? ActiveHours { get; set; }

        // רוב הפעילויות במרחק הליכה זו מזו — מוצג רק כחיובי, לעולם לא כאזהרה.
        [JsonPropertyName("isCompact")]
        public bool IsCompact { get; set; }
    }

    // נזרקת כשמבקשים מסלול חדש בתוך חלון הצינון (30 שניות) — ה-Controller ממפה ל-429.
    public class AiItineraryCooldownException : Exception { }

    // נזרקת על כל כשל מול המודל (שגיאת API, סירוב, תשובה לא תקינה או דלה) —
    // ה-Controller ממפה ל-502 עם הודעת משתמש בלבד. הפרטים הטכניים נשארים בלוג השרת.
    public class AiItineraryUnavailableException : Exception
    {
        public AiItineraryUnavailableException(string logDetail) : base(logDetail) { }
    }
}
