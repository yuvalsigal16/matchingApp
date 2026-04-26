using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ToDoListController : ControllerBase
    {
        private readonly ToDoList bl = new();

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
                return Ok(bl.GetTasksByUserID(userId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
