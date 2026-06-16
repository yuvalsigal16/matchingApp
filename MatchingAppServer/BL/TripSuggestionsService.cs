using System.Text.Json;

namespace MatchingAppServer.BL
{
    public class TripSuggestionsService
    {
        private readonly HttpClient client =
            new HttpClient();

        private const string GOOGLE_KEY =
            "PUT_YOUR_KEY_HERE";

        public async Task<object>
        GetSuggestions(
            string destination,
            string interests
        )
        {
            string query =
                $"{interests} in {destination}";

            string url =
$"https://maps.googleapis.com/maps/api/place/textsearch/json?query={query}&key={GOOGLE_KEY}";

            var response =
                await client.GetStringAsync(
                    url
                );

            var json =
                JsonDocument.Parse(
                    response
                );

            return json
                .RootElement
                .GetProperty(
                    "results"
                )
                .EnumerateArray()
                .Take(5)
                .Select(
                    x => new
                    {
                        name =
                            x.GetProperty(
                                "name"
                            )
                            .GetString(),

                        address =
                            x.GetProperty(
                                "formatted_address"
                            )
                            .GetString(),

                        rating =
                            x.TryGetProperty(
                                "rating",
                                out var r
                            )
                                ? r.GetDouble()
                                : 0
                    }
                );
        }
    }
}