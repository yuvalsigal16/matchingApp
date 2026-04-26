using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class MatchRatingDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD
        public int Add(MatchRating rating)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@MatchID", rating.MatchID },
                { "@RaterUserID", rating.RaterUserID },
                { "@Score", rating.Score },
                { "@ReviewText", rating.ReviewText }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddMatchRating", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // GET
        public List<MatchRating> GetByMatchID(int matchID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@MatchID", matchID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetMatchRatingsByMatchID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<MatchRating> list = new List<MatchRating>();

                while (reader.Read())
                {
                    list.Add(new MatchRating
                    {
                        RatingID = Convert.ToInt32(reader["RatingID"]),
                        MatchID = Convert.ToInt32(reader["MatchID"]),
                        RaterUserID = Convert.ToInt32(reader["RaterUserID"]),
                        Score = Convert.ToInt32(reader["Score"]),
                        ReviewText = reader["ReviewText"]?.ToString(),
                        RatedAt = Convert.ToDateTime(reader["RatedAt"])
                    });
                }

                return list;
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
    }
}
