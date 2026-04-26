using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuestionnaireController : ControllerBase
    {
        Questionnaire bl = new Questionnaire();

        // GET
        [HttpGet("{userId}")]
        public IActionResult Get(int userId)
        {
            try
            {
                var result = bl.GetByUserID(userId);

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
