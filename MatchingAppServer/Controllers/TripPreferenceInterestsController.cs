using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TripPreferenceInterestsController : ControllerBase
    {
        TripPreferenceInterests bl = new TripPreferenceInterests();

        // ADD interest to trip preference
        [HttpPost]
        public IActionResult Add(int tripPreferenceID, int interestID)
        {
            try
            {
                int result = bl.Add(tripPreferenceID, interestID);

                if (result > 0)
                    return Ok("Added");

                return BadRequest();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // DELETE interest
        [HttpDelete]
        public IActionResult Delete(int tripPreferenceID, int interestID)
        {
            try
            {
                int result = bl.Delete(tripPreferenceID, interestID);

                if (result > 0)
                    return Ok("Deleted");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET interests by TripPreferenceID
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
