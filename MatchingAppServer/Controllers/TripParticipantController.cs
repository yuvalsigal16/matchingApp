using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TripParticipantController : ControllerBase
    {
        TripParticipant bl = new TripParticipant();

        // שולף את UserID של המשתמש המחובר מה-JWT.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }


        [HttpPost("add")]
        public IActionResult Add([FromBody] TripParticipant model)
        {
            try
            {
                // רק בעל הטיול יכול להוסיף משתתפים, או משתמש שמצרף את עצמו.
                int uid = GetCurrentUserId();
                var trip = new Trip().GetTripById(model.TripID);
                if (trip == null)
                    return NotFound();
                if (trip.CreatedByUserID != uid && model.UserID != uid)
                    return Forbid();

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
                // רק בעל הטיול יכול להסיר משתתפים, או משתמש שמסיר את עצמו.
                int uid = GetCurrentUserId();
                var trip = new Trip().GetTripById(model.TripID);
                if (trip == null)
                    return NotFound();
                if (trip.CreatedByUserID != uid && model.UserID != uid)
                    return Forbid();

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
