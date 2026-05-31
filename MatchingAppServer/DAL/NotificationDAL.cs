using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    public class NotificationDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // CREATE
        public int Create(int userID, string type, string title, string body, int? relatedID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userID },
                { "@Type", type },
                { "@Title", title },
                { "@Body", (object)body ?? DBNull.Value },
                { "@RelatedID", (object)relatedID ?? DBNull.Value }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("CreateNotification", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
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

        // GET BY USER
        public List<Notification> GetByUserID(int userID)
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

            cmd = CreateCommandWithStoredProcedureGeneral("GetNotificationsByUserID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<Notification> list = new List<Notification>();

                while (reader.Read())
                {
                    list.Add(new Notification
                    {
                        NotificationID = Convert.ToInt32(reader["NotificationID"]),
                        UserID         = Convert.ToInt32(reader["UserID"]),
                        Type           = reader["Type"].ToString(),
                        Title          = reader["Title"].ToString(),
                        Body           = reader["Body"] == DBNull.Value ? null : reader["Body"].ToString(),
                        RelatedID      = reader["RelatedID"] == DBNull.Value ? (int?)null : Convert.ToInt32(reader["RelatedID"]),
                        IsRead         = Convert.ToBoolean(reader["IsRead"]),
                        CreatedAt      = Convert.ToDateTime(reader["CreatedAt"])
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

        // MARK READ
        public int MarkRead(int notificationID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@NotificationID", notificationID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("MarkNotificationRead", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
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
    }
}
