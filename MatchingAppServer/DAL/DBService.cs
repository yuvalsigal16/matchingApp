using Microsoft.Data.SqlClient;
using System.Data;

namespace MatchingAppServer.DAL
{
    public class DBService
    {
        protected SqlConnection connect()
        {
            IConfigurationRoot configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json").Build(); // טוען את קובץ ההגדרות על מנת לגשת למחרוזת החיבור
            string cStr = configuration.GetConnectionString("myProject");// שליפת מחרוזת החיבור לפי השם myProjDB
            SqlConnection con = new SqlConnection(cStr);  // יצירת אובייקט SqlConnection עם מחרוזת החיבור

            con.Open(); //פיתחת החיבור למסד
            return con;  // החזרת החיבור הפתוח

        }

        protected SqlCommand CreateCommandWithStoredProcedureGeneral(String spName, SqlConnection con, Dictionary<string, object> paramDic)
        {

            SqlCommand cmd = new SqlCommand();// יצירת אובייקט פקודה חדש
            cmd.Connection = con; // קישור הפקודה לחיבור למסד הנתונים
            cmd.CommandText = spName;// שם ה־Stored Procedure להרצה
            cmd.CommandTimeout = 10; // מגבלת זמן להרצה (שניות) — למניעת תקיעות
            cmd.CommandType = System.Data.CommandType.StoredProcedure; // הגדרה שהפקודה היא Stored Procedure ולא שאילתא רגילה
            if (paramDic != null)
                foreach (KeyValuePair<string, object> param in paramDic)
                {
                    cmd.Parameters.AddWithValue(param.Key, param.Value);// מוסיף כל פרמטר שה־SP דורש
                    //cmd.Parameters.Add(param.Key, SqlDbType.NVarChar, 4000).Value = param.Value ?? DBNull.Value;

                }
            return cmd;// מחזיר את אובייקט הפקודה מוכן להרצה

        }
    }
}
