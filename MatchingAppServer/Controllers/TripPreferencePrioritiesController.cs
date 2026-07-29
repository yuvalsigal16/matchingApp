using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TripPreferencePrioritiesController : ControllerBase
    {
        TripPreferencePriority bl = new TripPreferencePriority();

        // מזהה המשתמש המחובר מה-JWT (כמו בשאר ה-Controllers) — לבדיקות בעלות/שיוך.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // ADD priority row (query string, כמו TripPreferenceInterests)
        [HttpPost]
        public IActionResult Add(int tripPreferenceID, string factor, int priorityRank)
        {
            try
            {
                // הרשאה: כתיבה מותרת רק אם ההעדפה שייכת לטיול שבבעלות המשתמש.
                int me = GetCurrentUserId();
                if (!new Trip().GetUserTrips(me)
                        .Any(t => new TripPreferences().GetByTripId(t.TripID)?.TripPreferenceID == tripPreferenceID))
                    return Forbid();

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
                // הרשאה: ניקוי מותר רק אם ההעדפה שייכת לטיול שבבעלות המשתמש.
                int me = GetCurrentUserId();
                if (!new Trip().GetUserTrips(me)
                        .Any(t => new TripPreferences().GetByTripId(t.TripID)?.TripPreferenceID == tripPreferenceID))
                    return Forbid();

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
