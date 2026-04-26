using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    public class MatchRatingController : ControllerBase
    {
        private readonly MatchRating bl = new ();

        // ADD RATING
        [HttpPost]
        public IActionResult Add([FromBody] MatchRating rating)
        {
            try
            {
                return Ok(bl.Add(rating));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET RATINGS
        [HttpGet("{matchID}")]
        public IActionResult Get(int matchID)
        {
            try
            {
                return Ok(bl.GetByMatchID(matchID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
