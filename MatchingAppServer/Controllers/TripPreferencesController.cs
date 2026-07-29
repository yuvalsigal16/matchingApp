using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class TripPreferencesController : ControllerBase
    {
        TripPreferences bl = new TripPreferences();

        // מזהה המשתמש המחובר מה-JWT (כמו בשאר ה-Controllers) — לבדיקות בעלות/שיוך.
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // GET by TripID
        [HttpGet("{tripId}")]
        public IActionResult Get(int tripId)
        {
            try
            {
                // הרשאה: קריאה מותרת לבעל הטיול או לצד מותאם (הפרטנר קורא לצורך ניקוד ההתאמה מהצ'אט).
                int me = GetCurrentUserId();
                var trip = new Trip().GetTripById(tripId);
                if (trip == null || (trip.CreatedByUserID != me
                    && !new MatchDetails().GetUserMatches(me).Any(m => m.TripID == tripId)))
                    return Forbid();

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
                // הרשאה: יצירת העדפות מותרת לבעל הטיול בלבד.
                if (new Trip().GetTripById(pref.TripID)?.CreatedByUserID != GetCurrentUserId())
                    return Forbid();

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
                // הרשאה: עדכון העדפות מותר לבעל הטיול בלבד.
                if (new Trip().GetTripById(pref.TripID)?.CreatedByUserID != GetCurrentUserId())
                    return Forbid();

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
