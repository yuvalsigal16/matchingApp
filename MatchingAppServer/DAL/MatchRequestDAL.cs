using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class MatchRequestDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // SEND REQUEST - tripID אופציונלי
        public int Send(int fromUserID, int toUserID, int? tripID)
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
                { "@TripID", (object)tripID ?? DBNull.Value }
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

        // APPROVE - מאשר ויוצר Match. מחזיר MatchID + ב-out את ה-FromUserID לצורך התראה.
        public int Approve(int requestID, out int fromUserID)
        {
            fromUserID = 0;

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
                reader = cmd.ExecuteReader();

                int matchID = 0;
                if (reader.Read())
                {
                    matchID = Convert.ToInt32(reader["MatchID"]);
                    fromUserID = Convert.ToInt32(reader["FromUserID"]);
                }

                return matchID;
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

        // REJECT - דוחה. ב-out מחזיר את FromUserID להתראה.
        public int Reject(int requestID, out int fromUserID)
        {
            fromUserID = 0;

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
                reader = cmd.ExecuteReader();

                int rows = 0;
                if (reader.Read())
                {
                    rows = Convert.ToInt32(reader["RowsAffected"]);
                    if (reader["FromUserID"] != DBNull.Value)
                        fromUserID = Convert.ToInt32(reader["FromUserID"]);
                }

                return rows;
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

        // GET PENDING - מועשר עם פרטי FromUser/ToUser מהפרופיל
        public List<MatchRequest> GetPending(int userID)
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
                        TripID = reader["TripID"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["TripID"]),
                        Status = reader["Status"].ToString(),
                        RequestDate = Convert.ToDateTime(reader["RequestDate"]),

                        FromFirstName = reader["FromFirstName"] == DBNull.Value ? null : reader["FromFirstName"].ToString(),
                        FromLastName = reader["FromLastName"] == DBNull.Value ? null : reader["FromLastName"].ToString(),
                        FromProfileImage = reader["FromProfileImage"] == DBNull.Value ? null : reader["FromProfileImage"].ToString(),
                        FromBirthDate = reader["FromBirthDate"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["FromBirthDate"]),

                        ToFirstName = reader["ToFirstName"] == DBNull.Value ? null : reader["ToFirstName"].ToString(),
                        ToLastName = reader["ToLastName"] == DBNull.Value ? null : reader["ToLastName"].ToString(),
                        ToProfileImage = reader["ToProfileImage"] == DBNull.Value ? null : reader["ToProfileImage"].ToString(),
                        ToBirthDate = reader["ToBirthDate"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(reader["ToBirthDate"]),
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
