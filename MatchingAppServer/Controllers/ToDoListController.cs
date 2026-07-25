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
