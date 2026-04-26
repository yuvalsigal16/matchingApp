using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class MatchDetailsDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        public List<MatchDetails> GetMatchesWithDetailsByUserID(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception)
            {
                throw;
            }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral(
                "GetMatchesWithDetailsByUserID",
                con,
                param
            );

            try
            {
                reader = cmd.ExecuteReader();

                List<MatchDetails> list = new List<MatchDetails>();

                while (reader.Read())
                {
                    list.Add(new MatchDetails
                    {
                        MatchID = Convert.ToInt32(reader["MatchID"]),
                        MatchStatus = reader["MatchStatus"].ToString(),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"]),

                        TripID = Convert.ToInt32(reader["TripID"]),
                        Destination = reader["Destination"].ToString(),
                        StartDate = Convert.ToDateTime(reader["StartDate"]),
                        EndDate = Convert.ToDateTime(reader["EndDate"]),

                        ChatID = Convert.ToInt32(reader["ChatID"]),

                        User1ID = Convert.ToInt32(reader["User1ID"]),
                        User1FirstName = reader["User1FirstName"].ToString(),
                        User1LastName = reader["User1LastName"].ToString(),
                        User1Image = reader["User1Image"]?.ToString(),

                        User2ID = Convert.ToInt32(reader["User2ID"]),
                        User2FirstName = reader["User2FirstName"].ToString(),
                        User2LastName = reader["User2LastName"].ToString(),
                        User2Image = reader["User2Image"]?.ToString(),

                        LastMessage = reader["LastMessage"]?.ToString(),

                        LastMessageTime = reader["LastMessageTime"] == DBNull.Value
                            ? (DateTime?)null
                            : Convert.ToDateTime(reader["LastMessageTime"])
                    });
                }

                return list;
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
    }
}
