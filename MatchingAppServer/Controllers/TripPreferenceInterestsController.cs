using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TripPreferenceInterestsController : ControllerBase
    {
        TripPreferenceInterests bl = new TripPreferenceInterests();

        // מזהה המשתמש המחובר מה-JWT (כמו בשאר ה-Controllers) — לבדיקות בעלות/שיוך.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // ADD interest to trip preference
        [HttpPost]
        public IActionResult Add(int tripPreferenceID, int interestID)
        {
            try
            {
                // הרשאה: כתיבה מותרת רק אם ההעדפה שייכת לטיול שבבעלות המשתמש.
                int me = GetCurrentUserId();
                if (!new Trip().GetUserTrips(me)
                        .Any(t => new TripPreferences().GetByTripId(t.TripID)?.TripPreferenceID == tripPreferenceID))
                    return Forbid();

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
                // הרשאה: מחיקה מותרת רק אם ההעדפה שייכת לטיול שבבעלות המשתמש.
                int me = GetCurrentUserId();
                if (!new Trip().GetUserTrips(me)
                        .Any(t => new TripPreferences().GetByTripId(t.TripID)?.TripPreferenceID == tripPreferenceID))
                    return Forbid();

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
                // הרשאה: קריאה מותרת לבעל הטיול או לצד מותאם (ניקוד התאמה).
                int me = GetCurrentUserId();
                var myTripIds = new Trip().GetUserTrips(me).Select(t => t.TripID)
                    .Concat(new MatchDetails().GetUserMatches(me)
                        .Where(x => x.TripID.HasValue).Select(x => x.TripID.Value));
                if (!myTripIds.Any(tid => new TripPreferences().GetByTripId(tid)?.TripPreferenceID == tripPreferenceID))
                    return Forbid();

                return Ok(bl.GetByTripPreferenceID(tripPreferenceID));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
