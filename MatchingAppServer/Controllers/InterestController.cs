using Microsoft.AspNetCore.Mvc;
using MatchingAppServer.BL;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class InterestController : ControllerBase
    {
        Interest bl = new Interest();

        [HttpGet]
        public IActionResult GetAll()
        {
            try
            {
                return Ok(bl.GetAll());
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost]
        public IActionResult Add([FromBody] Interest interest)
        {
            try
            {
                return Ok(bl.Add(interest));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
