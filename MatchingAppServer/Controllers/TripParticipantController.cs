using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripParticipantController : ControllerBase
    {
        TripParticipant bl = new TripParticipant();


        [HttpPost("add")]
        public IActionResult Add([FromBody] TripParticipant model)
        {
            try
            {
                return Ok(bl.Add(model.TripID, model.UserID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("remove")]
        public IActionResult Remove([FromBody] TripParticipant model)
        {
            try
            {
                return Ok(bl.Remove(model.TripID, model.UserID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET USERS IN TRIP
        [HttpGet("trip/{tripId}")]
        public IActionResult GetUsers(int tripId)
        {
            try
            {
                return Ok(bl.GetUsersByTrip(tripId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
