using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;

namespace MatchingAppServer.DAL
{
    public class CommunityMessageDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // SEND MESSAGE
        public int SendMessage(CommunityMessage msg)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityChatID", msg.CommunityChatID },
                { "@SenderUserID", msg.SenderUserID },
                { "@Content", msg.Content }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("SendCommunityMessage", con, param);

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

        // GET MESSAGES
        public List<CommunityMessage> GetMessagesByChatID(int chatID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityChatID", chatID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetCommunityMessagesByChatID", con, param);

            try
            {
                reader = cmd.ExecuteReader();
                List<CommunityMessage> list = new List<CommunityMessage>();

                while (reader.Read())
                {
                    list.Add(new CommunityMessage
                    {
                        CommunityMessageID = Convert.ToInt32(reader["CommunityMessageID"]),
                        CommunityChatID = Convert.ToInt32(reader["CommunityChatID"]),
                        SenderUserID = Convert.ToInt32(reader["SenderUserID"]),
                        Content = reader["Content"].ToString(),
                        SentAt = Convert.ToDateTime(reader["SentAt"])
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
