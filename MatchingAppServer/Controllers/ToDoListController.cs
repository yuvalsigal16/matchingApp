using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ToDoListController : ControllerBase
    {
        private readonly ToDoList bl = new();

        // שולף את UserID של המשתמש המחובר מה-JWT (מונע IDOR — מתעלמים ממזהה שמגיע מהלקוח).
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        [HttpPost("add")]
        public IActionResult AddTask([FromBody] ToDoList task)
        {
            try
            {
                // הרשאה: הוספת משימה מותרת רק למשתתף הטיול; ה-UserID נלקח מה-JWT (לא מהלקוח).
                int me = GetCurrentUserId();
                var trip = new Trip().GetTripById(task.TripID);
                if (trip == null || (trip.CreatedByUserID != me
                    && !new MatchDetails().GetUserMatches(me).Any(m => m.TripID == task.TripID)))
                    return Forbid();
                task.UserID = me;

                int id = bl.AddTask(task);
                return Ok(new { TaskID = id });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut("done/{taskId}")]
        public IActionResult MarkDone(int taskId, [FromQuery] bool isDone)
        {
            try
            {
                // הרשאה: סימון מותר רק אם המשימה שייכת לטיול שהמשתמש משתתף בו.
                int me = GetCurrentUserId();
                var myTripIds = new Trip().GetUserTrips(me).Select(t => t.TripID)
                    .Concat(new MatchDetails().GetUserMatches(me)
                        .Where(x => x.TripID.HasValue).Select(x => x.TripID.Value));
                if (!myTripIds.Any(tid => bl.GetTasksByTripID(tid).Any(t => t.TaskID == taskId)))
                    return Forbid();

                int rows = bl.MarkTaskDone(taskId, isDone);
                return Ok(new { RowsAffected = rows });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{taskId}")]
        public IActionResult Delete(int taskId)
        {
            try
            {
                // הרשאה: מחיקה מותרת רק אם המשימה שייכת לטיול שהמשתמש משתתף בו.
                int me = GetCurrentUserId();
                var myTripIds = new Trip().GetUserTrips(me).Select(t => t.TripID)
                    .Concat(new MatchDetails().GetUserMatches(me)
                        .Where(x => x.TripID.HasValue).Select(x => x.TripID.Value));
                if (!myTripIds.Any(tid => bl.GetTasksByTripID(tid).Any(t => t.TaskID == taskId)))
                    return Forbid();

                int rows = bl.DeleteTask(taskId);
                return Ok(new { RowsAffected = rows });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("trip/{tripId}")]
        public IActionResult GetByTrip(int tripId)
        {
            try
            {
                // הרשאה: משימות הטיול נחשפות רק למשתתפי הטיול (בעלים או צד מותאם).
                int me = GetCurrentUserId();
                var trip = new Trip().GetTripById(tripId);
                if (trip == null || (trip.CreatedByUserID != me
                    && !new MatchDetails().GetUserMatches(me).Any(m => m.TripID == tripId)))
                    return Forbid();

                return Ok(bl.GetTasksByTripID(tripId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("user/{userId}")]
        public IActionResult GetByUser(int userId)
        {
            try
            {
                return Ok(bl.GetTasksByUserID(GetCurrentUserId()));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
