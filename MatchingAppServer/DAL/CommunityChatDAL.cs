using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;
using System.Reflection.PortableExecutable;

namespace MatchingAppServer.DAL
{
    public class CommunityChatDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // GET CHAT BY COMMUNITY ID
        public CommunityChat GetChatByCommunityID(int communityID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", communityID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetCommunityChatByCommunityID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new CommunityChat
                    {
                        CommunityChatID = Convert.ToInt32(reader["CommunityChatID"]),
                        CommunityID = Convert.ToInt32(reader["CommunityID"]),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
                    };
                }

                return null;
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

        // GET CHAT BY CHAT ID — לאיתור הקהילה (CommunityID) של צ'אט נתון, לצורך בדיקת חברות
        public CommunityChat GetChatByChatID(int chatID)
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

            cmd = CreateCommandWithStoredProcedureGeneral("GetCommunityChatById", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new CommunityChat
                    {
                        CommunityChatID = Convert.ToInt32(reader["CommunityChatID"]),
                        CommunityID = Convert.ToInt32(reader["CommunityID"]),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
                    };
                }

                return null;
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
