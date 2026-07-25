using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TripPreferencesController : ControllerBase
    {
        TripPreferences bl = new TripPreferences();

        // GET by TripID
        [HttpGet("{tripId}")]
        public IActionResult Get(int tripId)
        {
            try
            {
                var result = bl.GetByTripId(tripId);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // ADD
        [HttpPost]
        public IActionResult Add([FromBody] TripPreferences pref)
        {
            try
            {
                return Ok(bl.AddTripPreferences(pref));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // UPDATE
        [HttpPut]
        public IActionResult Update([FromBody] TripPreferences pref)
        {
            try
            {
                int result = bl.UpdateTripPreferences(pref);

                if (result > 0)
                    return Ok("Updated");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
