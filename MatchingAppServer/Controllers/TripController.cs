using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;


namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TripController : ControllerBase
    {
        Trip bl = new Trip();

        [Authorize]
        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            try
            {
                return Ok(bl.GetUserTrips(userId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpGet("{tripId}")]
        public IActionResult GetTripById(int tripId)
        {
            try
            {
                var trip = bl.GetTripById(tripId);

                if (trip == null)
                    return NotFound();

                return Ok(trip);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPost]
        public IActionResult Add([FromBody] Trip trip)
        {
            try
            {
                return Ok(bl.AddTrip(trip));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] Trip trip)
        {
            try
            {
                int result = bl.UpdateTrip(trip);

                if (result > 0)
                    return Ok("Updated");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("{tripId}")]
        public IActionResult Delete(int tripId)
        {
            try
            {
                int result = bl.DeleteTrip(tripId);

                if (result == 1)
                    return Ok("Deleted");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }


        [Authorize]
[HttpGet("destinations")]
public IActionResult GetDestinations()
{
    try
    {
        return Ok(bl.GetDestinations());
    }
    catch (Exception ex)
    {
        return BadRequest(ex.Message);
    }
}
    }
}
