using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class QuestionnaireController : ControllerBase
    {
        Questionnaire bl = new Questionnaire();

        // שולף את UserID של המשתמש המחובר מה-JWT (מונע IDOR — מתעלמים ממזהה שמגיע מהלקוח).
        private int GetCurrentUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("No user ID in token");
            return int.Parse(userIdClaim.Value);
        }

        // GET
        [HttpGet("{userId}")]
        public IActionResult Get(int userId)
        {
            try
            {
                var result = bl.GetByUserID(GetCurrentUserId());

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
        public IActionResult Add([FromBody] Questionnaire q)
        {
            try
            {
                q.UserID = GetCurrentUserId(); // מזהה מה-JWT, לא מהלקוח (מונע IDOR)
                return Ok(bl.Add(q));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // UPDATE
        [HttpPut]
        public IActionResult Update([FromBody] Questionnaire q)
        {
            try
            {
                q.UserID = GetCurrentUserId(); // מזהה מה-JWT, לא מהלקוח (מונע IDOR)
                int result = bl.Update(q);

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
