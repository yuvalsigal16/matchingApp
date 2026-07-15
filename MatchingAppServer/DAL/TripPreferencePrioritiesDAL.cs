using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;

namespace MatchingAppServer.DAL
{
    public class TripPreferencePrioritiesDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD — שורת דירוג אחת.
        public int Add(int tripPreferenceID, string factor, int priorityRank)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripPreferenceID", tripPreferenceID },
                { "@Factor", factor },
                { "@PriorityRank", priorityRank }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddTripPreferencePriority", con, param);

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

        // CLEAR — מנקה את כל הדירוגים של ההעדפה.
        public int Clear(int tripPreferenceID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripPreferenceID", tripPreferenceID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("ClearTripPreferencePriorities", con, param);

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

        // GET — דירוגים לפי סדר חשיבות.
        public List<TripPreferencePriority> GetByTripPreferenceID(int tripPreferenceID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripPreferenceID", tripPreferenceID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetTripPreferencePriorities", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                List<TripPreferencePriority> list = new List<TripPreferencePriority>();

                while (reader.Read())
                {
                    list.Add(new TripPreferencePriority
                    {
                        TripPreferenceID = Convert.ToInt32(reader["TripPreferenceID"]),
                        Factor = reader["Factor"].ToString(),
                        // PriorityRank הוא TINYINT (=byte ב-.NET), ממירים ידנית.
                        PriorityRank = Convert.ToInt32(reader["PriorityRank"])
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
