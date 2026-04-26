using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class MatchRequestDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // SEND REQUEST
        public int Send(int fromUserID, int toUserID, int tripID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@FromUserID", fromUserID },
                { "@ToUserID", toUserID },
                { "@TripID", tripID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("SendMatchRequest", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // RequestID
                return Convert.ToInt32(result);
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

        // REJECT
        public int Reject(int requestID)
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

            cmd = CreateCommandWithStoredProcedureGeneral("RejectMatchRequest", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // RowsAffected
                return Convert.ToInt32(result);
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

        // CANCEL
        public int Cancel(int requestID)
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

            cmd = CreateCommandWithStoredProcedureGeneral("CancelMatchRequest", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // RowsAffected
                return Convert.ToInt32(result);
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

        // GET PENDING
        public List<MatchRequest> GetPending(int userID)
        {
            try{
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetPendingMatchRequestsByUserID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<MatchRequest> list = new List<MatchRequest>();

                while (reader.Read())
                {
                    list.Add(new MatchRequest
                    {
                        RequestID = Convert.ToInt32(reader["RequestID"]),
                        FromUserID = Convert.ToInt32(reader["FromUserID"]),
                        ToUserID = Convert.ToInt32(reader["ToUserID"]),
                        TripID = Convert.ToInt32(reader["TripID"]),
                        Status = reader["Status"].ToString(),
                        RequestDate = Convert.ToDateTime(reader["RequestDate"])
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
