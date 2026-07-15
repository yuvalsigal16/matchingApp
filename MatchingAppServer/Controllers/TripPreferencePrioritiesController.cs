using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripPreferencePrioritiesController : ControllerBase
    {
        TripPreferencePriority bl = new TripPreferencePriority();

        // ADD priority row (query string, כמו TripPreferenceInterests)
        [HttpPost]
        public IActionResult Add(int tripPreferenceID, string factor, int priorityRank)
        {
            try
            {
                int result = bl.Add(tripPreferenceID, factor, priorityRank);

                if (result > 0)
                    return Ok(new { message = "Priority added successfully" });

                return BadRequest();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // CLEAR all priorities for a trip preference
        [HttpDelete("{tripPreferenceID}")]
        public IActionResult Clear(int tripPreferenceID)
        {
            try
            {
                bl.Clear(tripPreferenceID);
                return Ok(new { message = "Priorities cleared" });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET priorities by TripPreferenceID
        [HttpGet("{tripPreferenceID}")]
        public IActionResult Get(int tripPreferenceID)
        {
            try
            {
                return Ok(bl.GetByTripPreferenceID(tripPreferenceID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
