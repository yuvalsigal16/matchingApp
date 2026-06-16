using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]

    public class TripSuggestionsController
        : ControllerBase
    {
        [HttpGet]

        public async Task<IActionResult>
        Get(
            string destination,
            string interests
        )
        {
            var service =
                new TripSuggestionsService();

            var result =
                await service
                    .GetSuggestions(
                        destination,
                        interests
                    );

            return Ok(result);
        }
    }
}