using MatchingAppServer.BL;
using Microsoft.AspNetCore.Mvc;

namespace MatchingAppServer.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationController : ControllerBase
    {
        private readonly Recommendation bl = new();

        [HttpPost]
        public IActionResult Add([FromBody] Recommendation rec)
        {
            try
            {
                int id = bl.AddRecommendation(rec);
                return Ok(new { RecommendationID = id });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPut]
        public IActionResult Update([FromBody] Recommendation rec)
        {
            try
            {
                int rows = bl.UpdateRecommendation(rec);
                return Ok(new { RowsAffected = rows });
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                int rows = bl.DeleteRecommendation(id);
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
                return Ok(bl.GetByTripID(tripId));
            }
            catch (Exception ex)
            {
                return BadRequest(ex.Message);
            }
        }

    }
}
