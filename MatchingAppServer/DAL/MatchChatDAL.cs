using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;

namespace MatchingAppServer.DAL
{
    public class MatchChatDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // GET CHAT BY MATCH
        public MatchChat GetByMatchID(int matchID)
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

            cmd = CreateCommandWithStoredProcedureGeneral("GetMatchChatByMatchID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new MatchChat
                    {
                        ChatID = Convert.ToInt32(reader["ChatID"]),
                        MatchID = Convert.ToInt32(reader["MatchID"]),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
                    };
                }

                return null;
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // SEND MESSAGE
        public int SendMessage(MatchMessage msg)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@ChatID", msg.ChatID },
                { "@SenderUserID", msg.SenderUserID },
                { "@Content", msg.Content }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("SendMatchMessage", con, param);

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

        // GET MESSAGES
        public List<MatchMessage> GetMessagesByChatID(int chatID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@ChatID", chatID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetMatchMessagesByChatID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<MatchMessage> list = new List<MatchMessage>();

                while (reader.Read())
                {
                    list.Add(new MatchMessage
                    {
                        MessageID = Convert.ToInt32(reader["MessageID"]),
                        ChatID = Convert.ToInt32(reader["ChatID"]),
                        SenderUserID = Convert.ToInt32(reader["SenderUserID"]),
                        Content = reader["Content"].ToString(),
                        SentAt = Convert.ToDateTime(reader["SentAt"])
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
