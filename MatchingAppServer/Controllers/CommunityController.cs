using MatchingAppServer.BL;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CommunityController : ControllerBase
    {
       private readonly Community bl = new();

        // ADD
        [Authorize]
        [HttpPost]
        public IActionResult Add([FromBody] Community community)
        {
            try
            {
                return Ok(bl.Add(community));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // GET ALL
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

        // GET BY ID
        [HttpGet("{id}")]
        public IActionResult Get(int id)
        {
            try
            {
                var community = bl.GetByID(id);

                if (community == null)
                    return NotFound();

                return Ok(community);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        // UPDATE
        [Authorize]
        [HttpPut]
        public IActionResult Update([FromBody] Community community)
        {
            try
            {
                int result = bl.Update(community);

                if (result > 0)
                    return Ok("Updated");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [Authorize]
        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                int result = bl.DeleteCommunity(id);

                if (result > 0)
                    return Ok("Community deleted");

                return NotFound();
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("{id}/with-members")]
        public IActionResult GetCommunityWithMembers(int id)
        {
            try
            {
                var result = bl.GetCommunityWithMembers(id);

                if (result == null)
                    return NotFound("Community not found");

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
