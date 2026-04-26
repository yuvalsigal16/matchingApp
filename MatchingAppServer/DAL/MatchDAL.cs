using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class MatchDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // APPROVE REQUEST → creates match
        public int Approve(int requestID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@RequestID", requestID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("ApproveMatchRequest", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // MatchID
                return Convert.ToInt32(result);
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // GET MATCHES BY USER
        public List<Match> GetByUserID(int userID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetMatchesByUserID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<Match> list = new List<Match>();

                while (reader.Read())
                {
                    list.Add(new Match
                    {
                        MatchID = Convert.ToInt32(reader["MatchID"]),
                        RequestID = Convert.ToInt32(reader["RequestID"]),
                        TripID = Convert.ToInt32(reader["TripID"]),
                        User1ID = Convert.ToInt32(reader["User1ID"]),
                        User2ID = Convert.ToInt32(reader["User2ID"]),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"]),
                        Status = reader["Status"].ToString()
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

        // CLOSE MATCH
        public int Close(int matchID)
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

            cmd = CreateCommandWithStoredProcedureGeneral("CloseMatch", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // RowsAffected
                return Convert.ToInt32(result);
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
