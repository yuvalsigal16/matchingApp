using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;

namespace MatchingAppServer.DAL
{
    public class TripPreferencesDAL: DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD
        public int AddTripPreferences(TripPreferences pref)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripID", pref.TripID },
                { "@PreferredGender", pref.PreferredGender },
                { "@PreferredAgeMin", pref.PreferredAgeMin },
                { "@PreferredAgeMax", pref.PreferredAgeMax },
                { "@IsSmoker", pref.IsSmoker },
                { "@KeepsKosher", pref.KeepsKosher },
                { "@KeepsShabbat", pref.KeepsShabbat },
                { "@SpontaneityLevel", pref.SpontaneityLevel },
                { "@LifestyleLevel", pref.LifestyleLevel }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddTripPreferences", con, param);

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

        // UPDATE
        public int UpdateTripPreferences(TripPreferences pref)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripID", pref.TripID },
                { "@PreferredGender", pref.PreferredGender },
                { "@PreferredAgeMin", pref.PreferredAgeMin },
                { "@PreferredAgeMax", pref.PreferredAgeMax },
                { "@IsSmoker", pref.IsSmoker },
                { "@KeepsKosher", pref.KeepsKosher },
                { "@KeepsShabbat", pref.KeepsShabbat },
                { "@SpontaneityLevel", pref.SpontaneityLevel },
                { "@LifestyleLevel", pref.LifestyleLevel }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateTripPreferences", con, param);

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

        // GET BY TRIP ID
        public TripPreferences GetByTripId(int tripId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@TripID", tripId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetTripPreferencesByTripID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new TripPreferences
                    {
                        TripPreferenceID = Convert.ToInt32(reader["TripPreferenceID"]),
                        TripID = Convert.ToInt32(reader["TripID"]),
                        PreferredGender = reader["PreferredGender"].ToString(),
                        PreferredAgeMin = reader["PreferredAgeMin"] as int?,
                        PreferredAgeMax = reader["PreferredAgeMax"] as int?,
                        IsSmoker = reader["IsSmoker"] as bool?,
                        KeepsKosher = reader["KeepsKosher"] as bool?,
                        KeepsShabbat = reader["KeepsShabbat"] as bool?,
                        SpontaneityLevel = reader["SpontaneityLevel"] as int?,
                        LifestyleLevel = reader["LifestyleLevel"] as int?
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
