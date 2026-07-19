using MatchingAppServer.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace MatchingAppServer
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            var jwtSettings = builder.Configuration.GetSection("Jwt");

            // ���� �� ����� ����� (Key) �������� ����� ���� ������� (����� ������� ����� ������)
            var key = Encoding.UTF8.GetBytes(jwtSettings["Key"]);

            builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
             .AddJwtBearer(options =>
             {
                 options.TokenValidationParameters = new TokenValidationParameters
                 {
                     ValidateIssuer = true,
                     ValidateAudience = true,
                     ValidateLifetime = true,
                     ValidateIssuerSigningKey = true,

                     ValidIssuer = jwtSettings["Issuer"],
                     ValidAudience = jwtSettings["Audience"],
                     IssuerSigningKey = new SymmetricSecurityKey(key)
                 };
             });

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            //builder.Services.AddSwaggerGen();
            builder.Services.AddSwaggerGen(options =>
            {
                options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = Microsoft.OpenApi.Models.ParameterLocation.Header,
                    Description = "Put: Bearer {your token}"
                });

                options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
                {
                    {
                        new Microsoft.OpenApi.Models.OpenApiSecurityScheme
                        {
                            Reference = new Microsoft.OpenApi.Models.OpenApiReference
                            {
                                Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] {}
                    }
                });
            });

            builder.Services.AddScoped<JwtService>();

            // שירות שליחת מייל (Brevo דרך HttpClient) — לאיפוס סיסמה
            builder.Services.AddHttpClient<IEmailService, BrevoEmailService>();

            // "המסלול שלכם" — הצעת מסלול מותאמת (Claude). Typed HttpClient באותו דפוס כמו Brevo.
            // 180 שניות: מסלול מלא של 8+ ימים נמדד ב-~100 שניות בפועל (90 היה הורג אותו
            // רגע לפני הסיום), ונשארים מתחת לתקרת ה-230 שניות של Azure App Service.
            builder.Services.AddMemoryCache();
            builder.Services.AddHttpClient<AiItineraryService>(c => c.Timeout = TimeSpan.FromSeconds(180));

            // העשרת מקומות (Google Places) — Typed Client נפרד: timeout קצר משל Claude.
            builder.Services.AddHttpClient<PlaceEnrichmentService>(c => c.Timeout = TimeSpan.FromSeconds(8));

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            //if (app.Environment.IsDevelopment())
            //{
            //    app.UseSwagger();
            //    app.UseSwaggerUI();
            //}

            app.UseSwagger();
            app.UseSwaggerUI();

            //app.UseHttpsRedirection();

            //����� ���� ���� ������ ������ ��� ������
            //������ ���� ��� ��� ���� ������� wwwroot �� �������
            //�� ���� ������ �-wwwroot ���� ���� ��� ������
            app.UseStaticFiles();

            app.UseCors(policy => policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());


            app.UseAuthentication();
            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}
