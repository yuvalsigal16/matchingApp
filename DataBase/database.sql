use MatchingApp

CREATE TABLE dbo.Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Email NVARCHAR(120) NOT NULL,
    UserPassword NVARCHAR(255) NOT NULL,
    ProfileImage NVARCHAR(255) NULL,
    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME()
);
ALTER TABLE dbo.Users
ADD CONSTRAINT UQ_Users_Email UNIQUE (Email);


create table dbo.UserProfile(
    ProfileID      INT IDENTITY(1,1) PRIMARY KEY,
    UserID         INT NOT NULL,
    FirstName      NVARCHAR(50) NOT NULL,
    LastName       NVARCHAR(50) NOT NULL,
    BirthDate      DATE NOT NULL,
    Gender         NVARCHAR(20) NULL,CHECK (Gender IN ('Male','Female','Other') OR Gender IS NULL),
    City           NVARCHAR(100) NULL,
    LastUpdated    DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_UserProfiles_User
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT UQ_UserProfiles_User UNIQUE (UserID)
);


CREATE TABLE dbo.Interests (
    InterestID   INT IDENTITY(1,1) PRIMARY KEY,
    InterestName NVARCHAR(50) NOT NULL,
    CONSTRAINT UQ_Interests_Name UNIQUE (InterestName)
);
 

CREATE TABLE dbo.UserInterests (
    UserID INT NOT NULL,
    InterestID INT NOT NULL,
    CONSTRAINT PK_UserInterests PRIMARY KEY (UserID, InterestID),
    CONSTRAINT FK_UserInterests_User
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_UserInterests_Interest
        FOREIGN KEY (InterestID) REFERENCES dbo.Interests(InterestID)
);
GO

CREATE TABLE dbo.Questionnaire (
    QuestionnaireID   INT IDENTITY(1,1) PRIMARY KEY,
    UserID            INT NOT NULL,
    IsSmoker          BIT NULL,
    KeepsKosher       BIT NULL,
    KeepsShabbat      BIT NULL,
    SpontaneityLevel  TINYINT NULL,      
    SocialNetworks    NVARCHAR(300) NULL,   
    CONSTRAINT FK_Questionnaire_User
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT UQ_Questionnaire_User UNIQUE (UserID),
    CONSTRAINT CK_Questionnaire_Spontaneity
        CHECK (SpontaneityLevel IS NULL OR SpontaneityLevel BETWEEN 1 AND 5)
);

Alter Table dbo.Questionnaire
ADD LifestyleLevel TINYINT NULL;
GO

Alter Table dbo.Questionnaire
ADD CONSTRAINT CK_Questionnaire_LifestyleLevel
CHECK (LifestyleLevel IS NULL OR LifestyleLevel BETWEEN 1 AND 5);
GO


CREATE TABLE dbo.Trips(
    TripID            INT IDENTITY(1,1) PRIMARY KEY,
    CreatedByUserID   INT NOT NULL,                -- ?????? ???? ?? ?????
    Destination       NVARCHAR(100) NOT NULL,      -- ??? (????)
    StartDate         DATE NOT NULL,               -- ????? ?????
    EndDate           DATE NOT NULL,               -- ????? ????
    Status            NVARCHAR(20) NOT NULL DEFAULT 'Active',  -- Active / Archive
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Trips_CreatedBy
        FOREIGN KEY (CreatedByUserID)
        REFERENCES dbo.Users(UserID),
    CONSTRAINT CK_Trips_Dates
        CHECK (EndDate >= StartDate),
    CONSTRAINT CK_Trips_Status
        CHECK (Status IN ('Active', 'Archive'))
);

CREATE TABLE dbo.TripPreferences (
    TripPreferenceID  INT IDENTITY(1,1) PRIMARY KEY,
    TripID            INT NOT NULL,
    PreferredGender   NVARCHAR(20) NULL,
    PreferredAgeMin   INT NULL,
    PreferredAgeMax   INT NULL,
    IsSmoker          BIT NULL,
    KeepsKosher       BIT NULL,
    KeepsShabbat      BIT NULL,
    SpontaneityLevel  TINYINT NULL,         -- 1-5
	LifestyleLevel   TINYINT NULL,
    CONSTRAINT FK_TripPreferences_Trip
        FOREIGN KEY (TripID) REFERENCES dbo.Trips(TripID),
    CONSTRAINT UQ_TripPreferences_Trip UNIQUE (TripID),
    CONSTRAINT CK_TripPreferences_AgeRange
        CHECK (
            PreferredAgeMin IS NULL OR PreferredAgeMax IS NULL
            OR PreferredAgeMax >= PreferredAgeMin),
    CONSTRAINT CK_TripPreferences_Spontaneity
        CHECK (SpontaneityLevel IS NULL OR SpontaneityLevel BETWEEN 1 AND 5)
);



CREATE TABLE dbo.TripPreferenceInterests (
    TripPreferenceID INT NOT NULL,
    InterestID       INT NOT NULL,
    CONSTRAINT PK_TripPreferenceInterests
        PRIMARY KEY (TripPreferenceID, InterestID),
    CONSTRAINT FK_TPI_TripPreference
        FOREIGN KEY (TripPreferenceID)
        REFERENCES dbo.TripPreferences(TripPreferenceID),
    CONSTRAINT FK_TPI_Interest
        FOREIGN KEY (InterestID)
        REFERENCES dbo.Interests(InterestID)
);
GO

ALTER TABLE dbo.TripPreferences
ADD CONSTRAINT CK_TripPreferences_Gender
CHECK (PreferredGender IN ('Male','Female','Other') OR PreferredGender IS NULL);
GO

ALTER TABLE dbo.TripPreferences
ADD CONSTRAINT CK_TripPref_LifestyleLevel
CHECK (LifestyleLevel IS NULL OR LifestyleLevel BETWEEN 1 AND 5);
GO

CREATE TABLE dbo.MatchRequests (
    RequestID    INT IDENTITY(1,1) PRIMARY KEY,
    FromUserID   INT NOT NULL,
    ToUserID     INT NOT NULL,
    TripID       INT NOT NULL,
    Status       NVARCHAR(20) NOT NULL DEFAULT 'Pending',
    RequestDate  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Requests_FromUser
        FOREIGN KEY (FromUserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_Requests_ToUser
        FOREIGN KEY (ToUserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_Requests_Trip
        FOREIGN KEY (TripID) REFERENCES dbo.Trips(TripID),
    CONSTRAINT CK_Requests_Status
        CHECK (Status IN ('Pending','Approved','Rejected','Cancelled')),
    CONSTRAINT CK_Requests_NotSelf
        CHECK (FromUserID <> ToUserID),
    CONSTRAINT UQ_MatchRequests_From_To_Trip
        UNIQUE (FromUserID, ToUserID, TripID)
);
GO

CREATE TABLE dbo.Matches (
    MatchID    INT IDENTITY(1,1) PRIMARY KEY,
    RequestID  INT NOT NULL,
    TripID     INT NOT NULL,
    User1ID    INT NOT NULL,
    User2ID    INT NOT NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    Status     NVARCHAR(20) NOT NULL DEFAULT 'Active',
    CONSTRAINT FK_Matches_Request
        FOREIGN KEY (RequestID) REFERENCES dbo.MatchRequests(RequestID),
    CONSTRAINT FK_Matches_Trip
        FOREIGN KEY (TripID) REFERENCES dbo.Trips(TripID),
    CONSTRAINT FK_Matches_User1
        FOREIGN KEY (User1ID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_Matches_User2
        FOREIGN KEY (User2ID) REFERENCES dbo.Users(UserID),
    CONSTRAINT UQ_Matches_Request UNIQUE (RequestID),
    CONSTRAINT CK_Matches_Users
        CHECK (User1ID <> User2ID),
    CONSTRAINT CK_Matches_Status
        CHECK (Status IN ('Active','Closed'))
);
GO

CREATE TABLE dbo.MatchChats (
    ChatID     INT IDENTITY(1,1) PRIMARY KEY,
    MatchID    INT NOT NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Chats_Match
        FOREIGN KEY (MatchID) REFERENCES dbo.Matches(MatchID),
    CONSTRAINT UQ_Chats_Match UNIQUE (MatchID)
);
GO

CREATE TABLE dbo.MatchMessages (
    MessageID     INT IDENTITY(1,1) PRIMARY KEY,
    ChatID        INT NOT NULL,
    SenderUserID  INT NOT NULL,
    Content       NVARCHAR(1000) NOT NULL,
    SentAt        DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_MatchMessages_Chat
        FOREIGN KEY (ChatID) REFERENCES dbo.MatchChats(ChatID),
    CONSTRAINT FK_MatchMessages_Sender
        FOREIGN KEY (SenderUserID) REFERENCES dbo.Users(UserID)
);
GO

CREATE TABLE dbo.MatchRatings (
    RatingID      INT IDENTITY(1,1) PRIMARY KEY,
    MatchID       INT NOT NULL,
    RaterUserID   INT NOT NULL,
    Score         TINYINT NOT NULL,
    ReviewText    NVARCHAR(500) NULL,
    RatedAt       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_MatchRatings_Match
        FOREIGN KEY (MatchID) REFERENCES dbo.Matches(MatchID),
    CONSTRAINT FK_MatchRatings_Rater
        FOREIGN KEY (RaterUserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT UQ_MatchRatings_Once
        UNIQUE (MatchID, RaterUserID),
    CONSTRAINT CK_MatchRatings_Score
        CHECK (Score BETWEEN 1 AND 5)
);
GO

CREATE TABLE dbo.Communities (
    CommunityID      INT IDENTITY(1,1) PRIMARY KEY,
    CommunityName    NVARCHAR(100) NOT NULL,
    Description      NVARCHAR(500) NULL,
    CreatedByUserID  INT NOT NULL,
    CreatedAt        DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Communities_User
        FOREIGN KEY (CreatedByUserID) REFERENCES dbo.Users(UserID)
);
GO

CREATE TABLE dbo.CommunityMembers (
    CommunityID INT NOT NULL,
    UserID      INT NOT NULL,
    JoinedAt    DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT PK_CommunityMembers PRIMARY KEY (CommunityID, UserID),
    CONSTRAINT FK_CommunityMembers_Community
        FOREIGN KEY (CommunityID) REFERENCES dbo.Communities(CommunityID),
    CONSTRAINT FK_CommunityMembers_User
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
);
GO

CREATE TABLE dbo.CommunityChats (
    CommunityChatID INT IDENTITY(1,1) PRIMARY KEY,
    CommunityID     INT NOT NULL,
    CreatedAt       DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_CommunityChats_Community
        FOREIGN KEY (CommunityID) REFERENCES dbo.Communities(CommunityID),
    CONSTRAINT UQ_CommunityChats_Community UNIQUE (CommunityID)
);
GO

CREATE TABLE dbo.CommunityMessages (
    CommunityMessageID INT IDENTITY(1,1) PRIMARY KEY,
    CommunityChatID    INT NOT NULL,
    SenderUserID       INT NOT NULL,
    Content            NVARCHAR(1000) NOT NULL,
    SentAt             DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_CommunityMessages_Chat
        FOREIGN KEY (CommunityChatID) REFERENCES dbo.CommunityChats(CommunityChatID),
    CONSTRAINT FK_CommunityMessages_Sender
        FOREIGN KEY (SenderUserID) REFERENCES dbo.Users(UserID)
);
GO

CREATE TABLE dbo.TripParticipants (
    TripID INT NOT NULL,
    UserID INT NOT NULL,
    CONSTRAINT PK_TripParticipants PRIMARY KEY (TripID, UserID),
    CONSTRAINT FK_TripParticipants_Trip
        FOREIGN KEY (TripID) REFERENCES dbo.Trips(TripID),
    CONSTRAINT FK_TripParticipants_User
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
);
GO

CREATE TABLE dbo.ToDoList (
    TaskID      INT IDENTITY(1,1) PRIMARY KEY,
    TripID      INT NOT NULL,
	UserID      INT NOT NULL,
    TaskText    NVARCHAR(300) NOT NULL,
    IsDone      BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_ToDo_Trip
        FOREIGN KEY (TripID) REFERENCES dbo.Trips(TripID),
	 CONSTRAINT FK_ToDo_User
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID)
);
GO

CREATE TABLE dbo.Recommendations (
    RecommendationID INT IDENTITY(1,1) PRIMARY KEY,
    UserID           INT NOT NULL,
    TripID           INT NOT NULL,
    PlaceName        NVARCHAR(100) NOT NULL,
    Description      NVARCHAR(500) NULL,
    Rating           TINYINT NULL,
    MediaUrl         NVARCHAR(255) NULL,
    IsAnonymous      BIT NOT NULL DEFAULT 0,
    CONSTRAINT FK_Reco_User
        FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_Reco_Trip
        FOREIGN KEY (TripID) REFERENCES dbo.Trips(TripID),
    CONSTRAINT CK_Reco_Rating
        CHECK (Rating IS NULL OR Rating BETWEEN 1 AND 5)
);
GO

CREATE TABLE dbo.UserProfileInteractions (
    InteractionID INT IDENTITY(1,1) PRIMARY KEY,

    FromUserID INT NOT NULL,

    ToUserID INT NOT NULL,

    InteractionType NVARCHAR(20) NOT NULL,

    CreatedAt DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_Interactions_FromUser
        FOREIGN KEY (FromUserID)
        REFERENCES dbo.Users(UserID),

    CONSTRAINT FK_Interactions_ToUser
        FOREIGN KEY (ToUserID)
        REFERENCES dbo.Users(UserID),

    CONSTRAINT CK_Interaction_Type
        CHECK (
            InteractionType IN (
                'View',
                'Like',
                'ChatRequest'
            )
        ),

    CONSTRAINT CK_Interaction_NotSelf
        CHECK (FromUserID <> ToUserID)
);
GO


USE MatchingApp;
GO

/* =========================================
   USERS
========================================= */

CREATE OR ALTER PROCEDURE dbo.GetAllUsers
    @CurrentUserID INT
AS
BEGIN
    SET NOCOUNT ON;

   SELECT 
    U.UserID,
    U.Email,
    U.ProfileImage,
    U.CreatedAt,

    P.FirstName,
    P.LastName,
    P.BirthDate,
    P.Gender,
    P.City,

    Q.IsSmoker,
    Q.KeepsKosher,
    Q.KeepsShabbat,
    Q.SpontaneityLevel,
    Q.LifestyleLevel,

    (
        SELECT I.InterestName
        FROM dbo.UserInterests UI
        JOIN dbo.Interests I
            ON I.InterestID = UI.InterestID
        WHERE UI.UserID = U.UserID
        FOR JSON PATH
    ) AS Interests

FROM dbo.Users U

LEFT JOIN dbo.UserProfile P
    ON P.UserID = U.UserID

LEFT JOIN dbo.Questionnaire Q
    ON Q.UserID = U.UserID
    WHERE U.UserID != @CurrentUserID

    -- לא להחזיר משתמשים שחסמתי
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.UserBlocks B
        WHERE B.UserID = @CurrentUserID
        AND B.BlockedUserID = U.UserID
    )

    -- לא להחזיר משתמשים שחסמו אותי
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.UserBlocks B
        WHERE B.UserID = U.UserID
        AND B.BlockedUserID = @CurrentUserID
    )

    ORDER BY U.CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.AddUser
    @Email NVARCHAR(120),
    @UserPassword NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Users WHERE Email = @Email)
    BEGIN
        RAISERROR('Email already exists.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Users (Email, UserPassword)
    VALUES (@Email, @UserPassword);

    SELECT SCOPE_IDENTITY() AS UserID;
END
GO

CREATE OR ALTER PROCEDURE dbo.LoginUser
    @Email NVARCHAR(120),
    @UserPassword NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT UserID, Email, CreatedAt
    FROM dbo.Users
    WHERE Email = @Email
      AND UserPassword = @UserPassword;
END
GO

---
DROP PROCEDURE dbo.LoginUser;
GO

--פרוצדורה חדשה להתחברות בטוחה מבלי לשלוח את הסיסמה!
CREATE OR ALTER PROCEDURE LoginUserByEmail
    @Email NVARCHAR(120)
AS
BEGIN
    SELECT 
        UserID,
        Email,
        UserPassword,
        CreatedAt
    FROM Users
    WHERE Email = @Email
END
GO



---בוצע שינוי בSELECT
CREATE OR ALTER PROCEDURE dbo.GetUserByID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT UserID, Email, CreatedAt
    FROM dbo.Users
    WHERE UserID = @UserID;
END
GO

CREATE OR ALTER PROCEDURE dbo.UpdateUser
    @UserID INT,
    @Email NVARCHAR(120)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE Email = @Email
          AND UserID <> @UserID
    )
    BEGIN
        RAISERROR('Email already exists.', 16, 1);
        RETURN;
    END

    UPDATE dbo.Users
    SET Email = @Email
     WHERE UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

--
CREATE OR ALTER PROCEDURE dbo.GetPasswordHashByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT UserPassword
    FROM dbo.Users
    WHERE UserID = @UserID;
END
GO

--בוצע שינוי פרוצדורה שתתאים לסיסמה מאובטחת
CREATE OR ALTER PROCEDURE dbo.ChangeUserPassword
    @UserID INT,
    @NewPassword NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Users
        WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    UPDATE dbo.Users
    SET UserPassword = @NewPassword
    WHERE UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO


/* =========================================
   USER PROFILE
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddUserProfile
    @UserID INT,
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @BirthDate DATE,
    @Gender NVARCHAR(20) = NULL,
    @City NVARCHAR(100) = NULL,
	@ProfileImage NVARCHAR(255) = NULL   -- 👈 הוספה

AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.UserProfile WHERE UserID = @UserID)
    BEGIN
        RAISERROR('Profile already exists for this user.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.UserProfile
    (UserID, FirstName, LastName, BirthDate, Gender, City, ProfileImage)
    VALUES
    (@UserID, @FirstName, @LastName, @BirthDate, @Gender, @City, @ProfileImage);

    SELECT SCOPE_IDENTITY() AS ProfileID;
END
GO

CREATE OR ALTER PROCEDURE dbo.UpdateUserProfile
    @UserID INT,
    @FirstName NVARCHAR(50),
    @LastName NVARCHAR(50),
    @BirthDate DATE,
    @Gender NVARCHAR(20) = NULL,
    @City NVARCHAR(100) = NULL,
	@ProfileImage NVARCHAR(255) = NULL   -- 👈 הוספה

AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @rows INT;

    UPDATE dbo.UserProfile
    SET FirstName = @FirstName,
        LastName = @LastName,
        BirthDate = @BirthDate,
        Gender = @Gender,
        City = @City,
        ProfileImage = @ProfileImage,
        LastUpdated = SYSDATETIME()
    WHERE UserID = @UserID;

    SET @rows = @@ROWCOUNT;

    IF @rows = 0
    BEGIN
        RAISERROR('Profile not found.', 16, 1);
        RETURN;
    END

    SELECT @rows AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetUserProfileByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
	    ProfileID,
        UserID,
        FirstName,
        LastName,
        BirthDate,
        Gender,
        City,
        ProfileImage,
        LastUpdated
    FROM dbo.UserProfile
    WHERE UserID = @UserID;
END
GO


/* =========================================
   QUESTIONNAIRE
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddQuestionnaire
    @UserID INT,
    @IsSmoker BIT = NULL,
    @KeepsKosher BIT = NULL,
    @KeepsShabbat BIT = NULL,
    @SpontaneityLevel TINYINT = NULL,
    @LifestyleLevel TINYINT = NULL,
    @SocialNetworks NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.Questionnaire WHERE UserID = @UserID)
    BEGIN
        RAISERROR('Questionnaire already exists for this user.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Questionnaire
    (UserID, IsSmoker, KeepsKosher, KeepsShabbat, SpontaneityLevel, SocialNetworks, LifestyleLevel)
    VALUES
    (@UserID, @IsSmoker, @KeepsKosher, @KeepsShabbat, @SpontaneityLevel, @SocialNetworks, @LifestyleLevel);

    SELECT SCOPE_IDENTITY() AS QuestionnaireID;
END
GO

CREATE OR ALTER PROCEDURE dbo.UpdateQuestionnaire
    @UserID INT,
    @IsSmoker BIT = NULL,
    @KeepsKosher BIT = NULL,
    @KeepsShabbat BIT = NULL,
    @SpontaneityLevel TINYINT = NULL,
    @LifestyleLevel TINYINT = NULL,
    @SocialNetworks NVARCHAR(300) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Questionnaire
    SET IsSmoker = @IsSmoker,
        KeepsKosher = @KeepsKosher,
        KeepsShabbat = @KeepsShabbat,
        SpontaneityLevel = @SpontaneityLevel,
        LifestyleLevel = @LifestyleLevel,
        SocialNetworks = @SocialNetworks
    WHERE UserID = @UserID;

    IF @@ROWCOUNT = 0
    BEGIN
        RAISERROR('Questionnaire not found.', 16, 1);
        RETURN;
    END

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetQuestionnaireByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.Questionnaire
    WHERE UserID = @UserID;
END
GO


/* =========================================
   INTERESTS
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddInterest
    @InterestName NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (SELECT 1 FROM dbo.Interests WHERE InterestName = @InterestName)
    BEGIN
        RAISERROR('Interest already exists.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Interests (InterestName)
    VALUES (@InterestName);

    SELECT SCOPE_IDENTITY() AS InterestID;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetAllInterests
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.Interests
    ORDER BY InterestName;
END
GO

CREATE OR ALTER PROCEDURE dbo.AddUserInterest
    @UserID INT,
    @InterestID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Interests WHERE InterestID = @InterestID)
    BEGIN
        RAISERROR('Interest does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.UserInterests
        WHERE UserID = @UserID
          AND InterestID = @InterestID
    )
    BEGIN
        RAISERROR('This interest already exists for the user.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.UserInterests (UserID, InterestID)
    VALUES (@UserID, @InterestID);

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.DeleteUserInterest
    @UserID INT,
    @InterestID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.UserInterests
    WHERE UserID = @UserID
      AND InterestID = @InterestID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetUserInterests
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT I.InterestID, I.InterestName
    FROM dbo.UserInterests UI
    INNER JOIN dbo.Interests I
        ON UI.InterestID = I.InterestID
    WHERE UI.UserID = @UserID
    ORDER BY I.InterestName;
END
GO


/* =========================================
   TRIPS
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddTrip
    @CreatedByUserID INT,
    @Destination NVARCHAR(100),
    @StartDate DATE,
    @EndDate DATE
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @CreatedByUserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF @EndDate < @StartDate
    BEGIN
        RAISERROR('EndDate must be after or equal to StartDate.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Trips (CreatedByUserID, Destination, StartDate, EndDate)
    VALUES (@CreatedByUserID, @Destination, @StartDate, @EndDate);

    SELECT SCOPE_IDENTITY() AS TripID;
END
GO

CREATE OR ALTER PROCEDURE dbo.UpdateTrip
    @TripID INT,
    @Destination NVARCHAR(100),
    @StartDate DATE,
    @EndDate DATE,
    @Status NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF @EndDate < @StartDate
    BEGIN
        RAISERROR('EndDate must be after or equal to StartDate.', 16, 1);
        RETURN;
    END

    IF @Status NOT IN ('Active', 'Archive')
    BEGIN
        RAISERROR('Status must be Active or Archive.', 16, 1);
        RETURN;
    END

    UPDATE dbo.Trips
    SET Destination = @Destination,
        StartDate = @StartDate,
        EndDate = @EndDate,
        Status = @Status
    WHERE TripID = @TripID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetTripByID
    @TripID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.Trips
    WHERE TripID = @TripID;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetTripsByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.Trips
    WHERE CreatedByUserID = @UserID
    ORDER BY CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.DeleteTrip
    @TripID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WHERE TripID = @TripID)
    BEGIN
        RAISERROR('Trip does not exist.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    BEGIN TRY
        DELETE FROM dbo.Recommendations
        WHERE TripID = @TripID;

        DELETE FROM dbo.ToDoList
        WHERE TripID = @TripID;

        DELETE FROM dbo.TripParticipants
        WHERE TripID = @TripID;

        DELETE FROM dbo.MatchRatings
        WHERE MatchID IN (
            SELECT MatchID
            FROM dbo.Matches
            WHERE TripID = @TripID
        );

        DELETE FROM dbo.MatchMessages
        WHERE ChatID IN (
            SELECT ChatID
            FROM dbo.MatchChats
            WHERE MatchID IN (
                SELECT MatchID
                FROM dbo.Matches
                WHERE TripID = @TripID
            )
        );

        DELETE FROM dbo.MatchChats
        WHERE MatchID IN (
            SELECT MatchID
            FROM dbo.Matches
            WHERE TripID = @TripID
        );

        DELETE FROM dbo.Matches
        WHERE TripID = @TripID;

        DELETE FROM dbo.MatchRequests
        WHERE TripID = @TripID;

        DELETE FROM dbo.TripPreferenceInterests
        WHERE TripPreferenceID IN (
            SELECT TripPreferenceID
            FROM dbo.TripPreferences
            WHERE TripID = @TripID
        );

        DELETE FROM dbo.TripPreferences
        WHERE TripID = @TripID;

        DELETE FROM dbo.Trips
        WHERE TripID = @TripID;

        COMMIT TRANSACTION;
        SELECT 1 AS Success;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


/* =========================================
   TRIP PREFERENCES
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddTripPreferences
    @TripID INT,
    @PreferredGender NVARCHAR(20) = NULL,
    @PreferredAgeMin INT = NULL,
    @PreferredAgeMax INT = NULL,
    @IsSmoker BIT = NULL,
    @KeepsKosher BIT = NULL,
    @KeepsShabbat BIT = NULL,
    @SpontaneityLevel TINYINT = NULL,
    @LifestyleLevel TINYINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WHERE TripID = @TripID)
    BEGIN
        RAISERROR('Trip does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (SELECT 1 FROM dbo.TripPreferences WHERE TripID = @TripID)
    BEGIN
        RAISERROR('Preferences already exist for this trip.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.TripPreferences
    (TripID, PreferredGender, PreferredAgeMin, PreferredAgeMax, IsSmoker, KeepsKosher, KeepsShabbat, SpontaneityLevel, LifestyleLevel)
    VALUES
    (@TripID, @PreferredGender, @PreferredAgeMin, @PreferredAgeMax, @IsSmoker, @KeepsKosher, @KeepsShabbat, @SpontaneityLevel, @LifestyleLevel);

    SELECT SCOPE_IDENTITY() AS TripPreferenceID;
END
GO

CREATE OR ALTER PROCEDURE dbo.UpdateTripPreferences
    @TripID INT,
    @PreferredGender NVARCHAR(20) = NULL,
    @PreferredAgeMin INT = NULL,
    @PreferredAgeMax INT = NULL,
    @IsSmoker BIT = NULL,
    @KeepsKosher BIT = NULL,
    @KeepsShabbat BIT = NULL,
    @SpontaneityLevel TINYINT = NULL,
    @LifestyleLevel TINYINT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.TripPreferences
    SET PreferredGender = @PreferredGender,
        PreferredAgeMin = @PreferredAgeMin,
        PreferredAgeMax = @PreferredAgeMax,
        IsSmoker = @IsSmoker,
        KeepsKosher = @KeepsKosher,
        KeepsShabbat = @KeepsShabbat,
        SpontaneityLevel = @SpontaneityLevel,
        LifestyleLevel = @LifestyleLevel
    WHERE TripID = @TripID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetTripPreferencesByTripID
    @TripID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.TripPreferences
    WHERE TripID = @TripID;
END
GO

CREATE OR ALTER PROCEDURE dbo.AddTripPreferenceInterest
    @TripPreferenceID INT,
    @InterestID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.TripPreferences WHERE TripPreferenceID = @TripPreferenceID)
    BEGIN
        RAISERROR('Trip preference does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Interests WHERE InterestID = @InterestID)
    BEGIN
        RAISERROR('Interest does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.TripPreferenceInterests
        WHERE TripPreferenceID = @TripPreferenceID
          AND InterestID = @InterestID
    )
    BEGIN
        RAISERROR('This interest already exists for the trip preference.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.TripPreferenceInterests (TripPreferenceID, InterestID)
    VALUES (@TripPreferenceID, @InterestID);

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.DeleteTripPreferenceInterest
    @TripPreferenceID INT,
    @InterestID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.TripPreferenceInterests
    WHERE TripPreferenceID = @TripPreferenceID
      AND InterestID = @InterestID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetTripPreferenceInterests
    @TripPreferenceID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT I.InterestID, I.InterestName
    FROM dbo.TripPreferenceInterests TPI
    INNER JOIN dbo.Interests I
        ON TPI.InterestID = I.InterestID
    WHERE TPI.TripPreferenceID = @TripPreferenceID
    ORDER BY I.InterestName;
END
GO


/* =========================================
   MATCH REQUESTS + MATCHES
========================================= */

--בוצע הוספה על בדיקת משתמש חסום
CREATE OR ALTER PROCEDURE dbo.SendMatchRequest
    @FromUserID INT,
    @ToUserID INT,
    @TripID INT
AS
BEGIN
    SET NOCOUNT ON;
	IF EXISTS (
    SELECT 1 FROM dbo.UserBlocks
    WHERE (UserID = @FromUserID AND BlockedUserID = @ToUserID)
       OR (UserID = @ToUserID AND BlockedUserID = @FromUserID)
		)
		BEGIN
			RAISERROR('Cannot send request - blocked user.', 16, 1);
			RETURN;
		END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @FromUserID)
    BEGIN
        RAISERROR('FromUser does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @ToUserID)
    BEGIN
        RAISERROR('ToUser does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WHERE TripID = @TripID)
    BEGIN
        RAISERROR('Trip does not exist.', 16, 1);
        RETURN;
    END

    IF @FromUserID = @ToUserID
    BEGIN
        RAISERROR('Cannot send request to yourself.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.MatchRequests
        WHERE FromUserID = @FromUserID
          AND ToUserID = @ToUserID
          AND TripID = @TripID
    )
    BEGIN
        RAISERROR('Match request already exists.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.MatchRequests (FromUserID, ToUserID, TripID)
    VALUES (@FromUserID, @ToUserID, @TripID);

    SELECT SCOPE_IDENTITY() AS RequestID;
END
GO

CREATE OR ALTER PROCEDURE dbo.RejectMatchRequest
    @RequestID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.MatchRequests
    SET Status = 'Rejected'
    WHERE RequestID = @RequestID
      AND Status = 'Pending';

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.CancelMatchRequest
    @RequestID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.MatchRequests
    SET Status = 'Cancelled'
    WHERE RequestID = @RequestID
      AND Status = 'Pending';

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.ApproveMatchRequest
    @RequestID INT
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @FromUserID INT,
            @ToUserID INT,
            @TripID INT,
            @NewMatchID INT;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.MatchRequests
        WHERE RequestID = @RequestID
          AND Status = 'Pending'
    )
    BEGIN
        RAISERROR('Pending request not found.', 16, 1);
        RETURN;
    END

    SELECT @FromUserID = FromUserID,
           @ToUserID = ToUserID,
           @TripID = TripID
    FROM dbo.MatchRequests
    WHERE RequestID = @RequestID;

    BEGIN TRANSACTION;

    BEGIN TRY
        UPDATE dbo.MatchRequests
        SET Status = 'Approved'
        WHERE RequestID = @RequestID;

        INSERT INTO dbo.Matches (RequestID, TripID, User1ID, User2ID)
        VALUES (@RequestID, @TripID, @FromUserID, @ToUserID);

        SET @NewMatchID = SCOPE_IDENTITY();

        INSERT INTO dbo.MatchChats (MatchID)
        VALUES (@NewMatchID);

        COMMIT TRANSACTION;

        SELECT @NewMatchID AS MatchID;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

--הוספת בדיקה בפרוצדורה
CREATE OR ALTER PROCEDURE dbo.GetPendingMatchRequestsByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.MatchRequests MR
    WHERE MR.ToUserID = @UserID
      AND MR.Status = 'Pending'
      -- לא להציג בקשות ממשתמשים שחסומים
      AND NOT EXISTS (
            SELECT 1
            FROM dbo.UserBlocks B
            WHERE B.UserID = @UserID
              AND B.BlockedUserID = MR.FromUserID
      )
    ORDER BY MR.RequestDate DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetMatchesByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.Matches
    WHERE User1ID = @UserID
       OR User2ID = @UserID
    ORDER BY CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.CloseMatch
    @MatchID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Matches
    SET Status = 'Closed'
    WHERE MatchID = @MatchID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO


/* =========================================
   MATCH CHATS + MESSAGES
========================================= */

CREATE OR ALTER PROCEDURE dbo.GetMatchChatByMatchID
    @MatchID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.MatchChats
    WHERE MatchID = @MatchID;
END
GO

--בוצע הוספת בדיקת משתמשים חסומים
CREATE OR ALTER PROCEDURE dbo.SendMatchMessage
    @ChatID INT,
    @SenderUserID INT,
    @Content NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.MatchChats WHERE ChatID = @ChatID)
    BEGIN
        RAISERROR('Chat does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @SenderUserID)
    BEGIN
        RAISERROR('Sender does not exist.', 16, 1);
        RETURN;
    END

		-- בדיקת חסימה בין שני המשתמשים של השיחה
	IF EXISTS (
		SELECT 1
		FROM dbo.Matches M
		WHERE M.MatchID = (SELECT MatchID FROM dbo.MatchChats WHERE ChatID = @ChatID)
		AND EXISTS (
			SELECT 1 FROM dbo.UserBlocks B
			WHERE (B.UserID = M.User1ID AND B.BlockedUserID = M.User2ID)
			   OR (B.UserID = M.User2ID AND B.BlockedUserID = M.User1ID)
		)
	)
	BEGIN
		RAISERROR('Cannot send message - users are blocked.', 16, 1);
		RETURN;
	END

    INSERT INTO dbo.MatchMessages (ChatID, SenderUserID, Content)
    VALUES (@ChatID, @SenderUserID, @Content);

    SELECT SCOPE_IDENTITY() AS MessageID;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetMatchMessagesByChatID
    @ChatID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.MatchMessages
    WHERE ChatID = @ChatID
    ORDER BY SentAt;
END
GO


/* =========================================
   MATCH RATINGS
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddMatchRating
    @MatchID INT,
    @RaterUserID INT,
    @Score TINYINT,
    @ReviewText NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Matches WHERE MatchID = @MatchID)
    BEGIN
        RAISERROR('Match does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @RaterUserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.MatchRatings
        WHERE MatchID = @MatchID
          AND RaterUserID = @RaterUserID
    )
    BEGIN
        RAISERROR('User already rated this match.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.MatchRatings (MatchID, RaterUserID, Score, ReviewText)
    VALUES (@MatchID, @RaterUserID, @Score, @ReviewText);

    SELECT SCOPE_IDENTITY() AS RatingID;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetMatchRatingsByMatchID
    @MatchID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.MatchRatings
    WHERE MatchID = @MatchID
    ORDER BY RatedAt DESC;
END
GO


/* =========================================
   COMMUNITIES
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddCommunity
    @CommunityName NVARCHAR(100),
    @Description NVARCHAR(500) = NULL,
    @CreatedByUserID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @CreatedByUserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Communities (CommunityName, Description, CreatedByUserID)
    VALUES (@CommunityName, @Description, @CreatedByUserID);

    DECLARE @CommunityID INT = SCOPE_IDENTITY();

    INSERT INTO dbo.CommunityMembers (CommunityID, UserID)
    VALUES (@CommunityID, @CreatedByUserID);

    INSERT INTO dbo.CommunityChats (CommunityID)
    VALUES (@CommunityID);

    SELECT @CommunityID AS CommunityID;
END
GO


--בוצע שינוי של הפרוצדורה הזו על ידי ליאל
CREATE OR ALTER PROCEDURE dbo.GetAllCommunities
AS
BEGIN
    SET NOCOUNT ON;

SELECT 
    C.CommunityID,
    C.CommunityName,
    C.Description,
    C.CreatedByUserID,
    C.CreatedAt,
    ISNULL((
        SELECT COUNT(*)
        FROM dbo.CommunityMembers CM
        WHERE CM.CommunityID = C.CommunityID
    ), 0) AS MembersCount

FROM dbo.Communities C
ORDER BY C.CreatedAt DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetCommunityByID
    @CommunityID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.Communities
    WHERE CommunityID = @CommunityID;
END
GO

CREATE OR ALTER PROCEDURE dbo.UpdateCommunity
    @CommunityID INT,
    @CommunityName NVARCHAR(100),
    @Description NVARCHAR(500) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Communities
    SET CommunityName = @CommunityName,
        Description = @Description
    WHERE CommunityID = @CommunityID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO


/* =========================================
   COMMUNITY MEMBERS
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddCommunityMember
    @CommunityID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Communities WHERE CommunityID = @CommunityID)
    BEGIN
        RAISERROR('Community does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.CommunityMembers
        WHERE CommunityID = @CommunityID
          AND UserID = @UserID
    )
    BEGIN
        RAISERROR('User is already a member of this community.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.CommunityMembers (CommunityID, UserID)
    VALUES (@CommunityID, @UserID);

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.RemoveCommunityMember
    @CommunityID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.CommunityMembers
    WHERE CommunityID = @CommunityID
      AND UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetCommunityMembers
    @CommunityID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        U.UserID, 
        U.Email, 
        P.ProfileImage,   -- 👈 הועבר לכאן
        CM.JoinedAt
    FROM dbo.CommunityMembers CM
    INNER JOIN dbo.Users U
        ON CM.UserID = U.UserID
    LEFT JOIN dbo.UserProfile P   -- 👈 הוספה
        ON P.UserID = U.UserID
    WHERE CM.CommunityID = @CommunityID
    ORDER BY CM.JoinedAt;
END
GO


/* =========================================
   COMMUNITY CHATS + MESSAGES
========================================= */

CREATE OR ALTER PROCEDURE dbo.GetCommunityChatByCommunityID
    @CommunityID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.CommunityChats
    WHERE CommunityID = @CommunityID;
END
GO

CREATE OR ALTER PROCEDURE dbo.SendCommunityMessage
    @CommunityChatID INT,
    @SenderUserID INT,
    @Content NVARCHAR(1000)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.CommunityChats WHERE CommunityChatID = @CommunityChatID)
    BEGIN
        RAISERROR('Community chat does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @SenderUserID)
    BEGIN
        RAISERROR('Sender does not exist.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.CommunityMessages (CommunityChatID, SenderUserID, Content)
    VALUES (@CommunityChatID, @SenderUserID, @Content);

    SELECT SCOPE_IDENTITY() AS CommunityMessageID;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetCommunityMessagesByChatID
    @CommunityChatID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.CommunityMessages
    WHERE CommunityChatID = @CommunityChatID
    ORDER BY SentAt;
END
GO


/* =========================================
   TRIP PARTICIPANTS
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddTripParticipant
    @TripID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WHERE TripID = @TripID)
    BEGIN
        RAISERROR('Trip does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF EXISTS (
        SELECT 1
        FROM dbo.TripParticipants
        WHERE TripID = @TripID
          AND UserID = @UserID
    )
    BEGIN
        RAISERROR('User is already a participant in this trip.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.TripParticipants (TripID, UserID)
    VALUES (@TripID, @UserID);

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.RemoveTripParticipant
    @TripID INT,
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.TripParticipants
    WHERE TripID = @TripID
      AND UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetTripParticipants
    @TripID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        U.UserID, 
        U.Email, 
        P.ProfileImage   -- 👈 שינוי
    FROM dbo.TripParticipants TP
    INNER JOIN dbo.Users U
        ON TP.UserID = U.UserID
    LEFT JOIN dbo.UserProfile P   -- 👈 הוספה
        ON P.UserID = U.UserID
    WHERE TP.TripID = @TripID;
END
GO


/* =========================================
   TODO LIST
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddTask
    @TripID INT,
    @UserID INT,
    @TaskText NVARCHAR(300)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WHERE TripID = @TripID)
    BEGIN
        RAISERROR('Trip does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.ToDoList (TripID, UserID, TaskText)
    VALUES (@TripID, @UserID, @TaskText);

    SELECT SCOPE_IDENTITY() AS TaskID;
END
GO

CREATE OR ALTER PROCEDURE dbo.MarkTaskDone
    @TaskID INT,
    @IsDone BIT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.ToDoList
    SET IsDone = @IsDone
    WHERE TaskID = @TaskID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.DeleteTask
    @TaskID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.ToDoList
    WHERE TaskID = @TaskID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetTasksByTripID
    @TripID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.ToDoList
    WHERE TripID = @TripID
    ORDER BY TaskID DESC;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetTasksByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.ToDoList
    WHERE UserID = @UserID
    ORDER BY TaskID DESC;
END
GO


/* =========================================
   RECOMMENDATIONS
========================================= */

CREATE OR ALTER PROCEDURE dbo.AddRecommendation
    @UserID INT,
    @TripID INT,
    @PlaceName NVARCHAR(100),
    @Description NVARCHAR(500) = NULL,
    @Rating TINYINT = NULL,
    @MediaUrl NVARCHAR(255) = NULL,
    @IsAnonymous BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Trips WHERE TripID = @TripID)
    BEGIN
        RAISERROR('Trip does not exist.', 16, 1);
        RETURN;
    END

    INSERT INTO dbo.Recommendations
    (UserID, TripID, PlaceName, Description, Rating, MediaUrl, IsAnonymous)
    VALUES
    (@UserID, @TripID, @PlaceName, @Description, @Rating, @MediaUrl, @IsAnonymous);

    SELECT SCOPE_IDENTITY() AS RecommendationID;
END
GO

CREATE OR ALTER PROCEDURE dbo.UpdateRecommendation
    @RecommendationID INT,
    @PlaceName NVARCHAR(100),
    @Description NVARCHAR(500) = NULL,
    @Rating TINYINT = NULL,
    @MediaUrl NVARCHAR(255) = NULL,
    @IsAnonymous BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.Recommendations
    SET PlaceName = @PlaceName,
        Description = @Description,
        Rating = @Rating,
        MediaUrl = @MediaUrl,
        IsAnonymous = @IsAnonymous
    WHERE RecommendationID = @RecommendationID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.DeleteRecommendation
    @RecommendationID INT
AS
BEGIN
    SET NOCOUNT ON;

    DELETE FROM dbo.Recommendations
    WHERE RecommendationID = @RecommendationID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetRecommendationsByTripID
    @TripID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT *
    FROM dbo.Recommendations
    WHERE TripID = @TripID
    ORDER BY RecommendationID DESC;
END
GO


/* =========================================
   DELETE USER
========================================= */

CREATE OR ALTER PROCEDURE dbo.DeleteUser
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    BEGIN TRY
	    DELETE FROM dbo.UserBlocks
        WHERE UserID = @UserID OR BlockedUserID = @UserID;

        DELETE FROM dbo.UserInterests
        WHERE UserID = @UserID;

        DELETE FROM dbo.Questionnaire
        WHERE UserID = @UserID;

        DELETE FROM dbo.UserProfile
        WHERE UserID = @UserID;

        DELETE FROM dbo.ToDoList
        WHERE UserID = @UserID;

        DELETE FROM dbo.Recommendations
        WHERE UserID = @UserID;

        DELETE FROM dbo.CommunityMessages
        WHERE SenderUserID = @UserID;

        DELETE FROM dbo.MatchMessages
        WHERE SenderUserID = @UserID;

        DELETE FROM dbo.CommunityMembers
        WHERE UserID = @UserID;

        DELETE FROM dbo.TripParticipants
        WHERE UserID = @UserID;

        DELETE FROM dbo.CommunityMessages
        WHERE CommunityChatID IN (
            SELECT CC.CommunityChatID
            FROM dbo.CommunityChats CC
            INNER JOIN dbo.Communities C
                ON CC.CommunityID = C.CommunityID
            WHERE C.CreatedByUserID = @UserID
        );

        DELETE FROM dbo.CommunityChats
        WHERE CommunityID IN (
            SELECT CommunityID
            FROM dbo.Communities
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.CommunityMembers
        WHERE CommunityID IN (
            SELECT CommunityID
            FROM dbo.Communities
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.Communities
        WHERE CreatedByUserID = @UserID;

        DELETE FROM dbo.MatchRatings
        WHERE MatchID IN (
            SELECT MatchID
            FROM dbo.Matches
            WHERE User1ID = @UserID OR User2ID = @UserID
        );

        DELETE FROM dbo.MatchMessages
        WHERE ChatID IN (
            SELECT MC.ChatID
            FROM dbo.MatchChats MC
            INNER JOIN dbo.Matches M
                ON MC.MatchID = M.MatchID
            WHERE M.User1ID = @UserID OR M.User2ID = @UserID
        );

        DELETE FROM dbo.MatchChats
        WHERE MatchID IN (
            SELECT MatchID
            FROM dbo.Matches
            WHERE User1ID = @UserID OR User2ID = @UserID
        );

        DELETE FROM dbo.Matches
        WHERE User1ID = @UserID OR User2ID = @UserID;

        DELETE FROM dbo.MatchRequests
        WHERE FromUserID = @UserID OR ToUserID = @UserID;

        DELETE FROM dbo.Recommendations
        WHERE TripID IN (
            SELECT TripID
            FROM dbo.Trips
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.ToDoList
        WHERE TripID IN (
            SELECT TripID
            FROM dbo.Trips
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.TripParticipants
        WHERE TripID IN (
            SELECT TripID
            FROM dbo.Trips
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.MatchRatings
        WHERE MatchID IN (
            SELECT MatchID
            FROM dbo.Matches
            WHERE TripID IN (
                SELECT TripID
                FROM dbo.Trips
                WHERE CreatedByUserID = @UserID
            )
        );

        DELETE FROM dbo.MatchMessages
        WHERE ChatID IN (
            SELECT MC.ChatID
            FROM dbo.MatchChats MC
            INNER JOIN dbo.Matches M
                ON MC.MatchID = M.MatchID
            WHERE M.TripID IN (
                SELECT TripID
                FROM dbo.Trips
                WHERE CreatedByUserID = @UserID
            )
        );

        DELETE FROM dbo.MatchChats
        WHERE MatchID IN (
            SELECT MatchID
            FROM dbo.Matches
            WHERE TripID IN (
                SELECT TripID
                FROM dbo.Trips
                WHERE CreatedByUserID = @UserID
            )
        );

        DELETE FROM dbo.Matches
        WHERE TripID IN (
            SELECT TripID
            FROM dbo.Trips
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.MatchRequests
        WHERE TripID IN (
            SELECT TripID
            FROM dbo.Trips
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.TripPreferenceInterests
        WHERE TripPreferenceID IN (
            SELECT TP.TripPreferenceID
            FROM dbo.TripPreferences TP
            INNER JOIN dbo.Trips T
                ON TP.TripID = T.TripID
            WHERE T.CreatedByUserID = @UserID
        );

        DELETE FROM dbo.TripPreferences
        WHERE TripID IN (
            SELECT TripID
            FROM dbo.Trips
            WHERE CreatedByUserID = @UserID
        );

        DELETE FROM dbo.Trips
        WHERE CreatedByUserID = @UserID;

        DELETE FROM dbo.Users
        WHERE UserID = @UserID;

        COMMIT TRANSACTION;
        SELECT 1 AS Success;
    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


--תוספות של פרוצדורות חשובות
CREATE OR ALTER PROCEDURE dbo.DeleteCommunity
    @CommunityID INT
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Communities WHERE CommunityID = @CommunityID)
    BEGIN
        RAISERROR('Community does not exist.', 16, 1);
        RETURN;
    END

    BEGIN TRANSACTION;

    BEGIN TRY

        DELETE FROM dbo.CommunityMessages
        WHERE CommunityChatID IN (
            SELECT CommunityChatID
            FROM dbo.CommunityChats
            WHERE CommunityID = @CommunityID
        );

        DELETE FROM dbo.CommunityChats
        WHERE CommunityID = @CommunityID;

        DELETE FROM dbo.CommunityMembers
        WHERE CommunityID = @CommunityID;

        DELETE FROM dbo.Communities
        WHERE CommunityID = @CommunityID;

        COMMIT TRANSACTION;

        SELECT 1 AS Success;

    END TRY
    BEGIN CATCH
        ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-------------
CREATE OR ALTER PROCEDURE dbo.GetCommunityWithMembers
    @CommunityID INT
AS
BEGIN
    SET NOCOUNT ON;

SELECT 
    C.CommunityID,
    C.CommunityName,
    C.Description,
    C.CreatedByUserID,
    C.CreatedAt,

    U.UserID AS MemberUserID,
    P.FirstName,
    P.LastName,
    P.ProfileImage,
    CM.JoinedAt
FROM Communities C

LEFT JOIN CommunityMembers CM 
    ON C.CommunityID = CM.CommunityID

LEFT JOIN Users U 
    ON CM.UserID = U.UserID

LEFT JOIN UserProfile P 
    ON P.UserID = U.UserID

WHERE C.CommunityID = @CommunityID
END
GO
-------------
CREATE OR ALTER PROCEDURE dbo.GetMatchesWithDetailsByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH LastMessages AS (
        SELECT 
            MM.ChatID,
            MM.Content,
            MM.SentAt,
            ROW_NUMBER() OVER (PARTITION BY MM.ChatID ORDER BY MM.SentAt DESC) AS rn
        FROM dbo.MatchMessages MM
    )

    SELECT 
        M.MatchID,
        M.Status AS MatchStatus,
        M.CreatedAt,

        T.TripID,
        T.Destination,
        T.StartDate,
        T.EndDate,

        C.ChatID,

        U1.UserID AS User1ID,
        P1.FirstName AS User1FirstName,
        P1.LastName AS User1LastName,
        P1.ProfileImage AS User1Image,

        U2.UserID AS User2ID,
        P2.FirstName AS User2FirstName,
        P2.LastName AS User2LastName,
        P2.ProfileImage AS User2Image,

        LM.Content AS LastMessage,
        LM.SentAt AS LastMessageTime

    FROM dbo.Matches M

    INNER JOIN dbo.Trips T 
        ON M.TripID = T.TripID

    INNER JOIN dbo.MatchChats C 
        ON C.MatchID = M.MatchID

    INNER JOIN dbo.Users U1 
        ON M.User1ID = U1.UserID

    LEFT JOIN dbo.UserProfile P1 
        ON P1.UserID = U1.UserID

    INNER JOIN dbo.Users U2 
        ON M.User2ID = U2.UserID

    LEFT JOIN dbo.UserProfile P2 
        ON P2.UserID = U2.UserID

    LEFT JOIN LastMessages LM 
        ON LM.ChatID = C.ChatID 
        AND LM.rn = 1

    WHERE 
    (
        M.User1ID = @UserID
        OR M.User2ID = @UserID
    )

    -- 🚫 חסימת משתמשים (חשוב!)
    AND NOT EXISTS (
        SELECT 1
        FROM dbo.UserBlocks B
        WHERE B.UserID = @UserID
        AND (
            B.BlockedUserID = U1.UserID
            OR B.BlockedUserID = U2.UserID
        )
    )

    ORDER BY M.CreatedAt DESC;
END
GO

----פרוצדורה להעלאת תמונה
CREATE OR ALTER PROCEDURE dbo.UpdateUserProfileImage
    @UserID INT,
    @ProfileImage NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE UserID = @UserID)
    BEGIN
        RAISERROR('User does not exist.', 16, 1);
        RETURN;
    END

    UPDATE dbo.UserProfile   -- 👈 שינוי קריטי
    SET ProfileImage = @ProfileImage,
        LastUpdated = SYSDATETIME()
    WHERE UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

--פרוצדורה למחיקת תמונה
CREATE OR ALTER PROCEDURE dbo.DeleteUserProfileImage
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.UserProfile   -- 👈 שינוי
    SET ProfileImage = NULL,
        LastUpdated = SYSDATETIME()
    WHERE UserID = @UserID;

    SELECT @@ROWCOUNT AS RowsAffected;
END
GO

CREATE OR ALTER PROCEDURE dbo.GetUserProfileImageByUserID
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT ProfileImage
    FROM dbo.UserProfile
    WHERE UserID = @UserID;
END
GO

--הוספת טבלה - משתמשים חסומים
CREATE TABLE dbo.UserBlocks
(
    BlockID INT IDENTITY PRIMARY KEY,
    UserID INT NOT NULL,
    BlockedUserID INT NOT NULL,
    BlockedAt DATETIME DEFAULT GETDATE(),

    CONSTRAINT FK_UserBlocks_User FOREIGN KEY (UserID) REFERENCES dbo.Users(UserID),
    CONSTRAINT FK_UserBlocks_Blocked FOREIGN KEY (BlockedUserID) REFERENCES dbo.Users(UserID),

    CONSTRAINT UQ_UserBlocks UNIQUE (UserID, BlockedUserID)
);
GO

-- אינדקס לייעול חיפושים לפי מי שחסם משתמש אחר
CREATE INDEX IX_UserBlocks_BlockedUserID
ON dbo.UserBlocks(BlockedUserID);
GO

-- אינדקס לייעול חיפושים לפי מי המשתמש חסם
CREATE INDEX IX_UserBlocks_UserID
ON dbo.UserBlocks(UserID);
GO

CREATE OR ALTER PROCEDURE dbo.BlockUser
    @UserID INT,
    @BlockedUserID INT
AS
BEGIN
    SET NOCOUNT ON;
    IF @UserID = @BlockedUserID
    BEGIN
        RAISERROR('Cannot block yourself', 16, 1);
        RETURN;
    END
    
    -- בדיקה שלא חסום כבר
    IF NOT EXISTS (SELECT 1 FROM dbo.UserBlocks 
                   WHERE UserID = @UserID AND BlockedUserID = @BlockedUserID)
    BEGIN
        INSERT INTO dbo.UserBlocks (UserID, BlockedUserID)
        VALUES (@UserID, @BlockedUserID);
    END
END
GO

--ביטול חסימה
CREATE OR ALTER PROCEDURE dbo.UnblockUser
    @UserID INT,
    @BlockedUserID INT
AS
BEGIN
    DELETE FROM dbo.UserBlocks
    WHERE UserID = @UserID AND BlockedUserID = @BlockedUserID;
END
GO

--רשימת החסומים של המשתמש
CREATE OR ALTER PROCEDURE dbo.GetBlockedUsers
    @UserID INT
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        b.BlockID, 
        b.BlockedUserID, 
        b.BlockedAt,
        up.FirstName, 
        up.LastName, 
        up.ProfileImage   -- 👈 שינוי
    FROM dbo.UserBlocks b
    INNER JOIN dbo.Users u 
        ON u.UserID = b.BlockedUserID
    LEFT JOIN dbo.UserProfile up 
        ON up.UserID = b.BlockedUserID
    WHERE b.UserID = @UserID
    ORDER BY b.BlockedAt DESC;
END
GO

--פרוצדורת עזר לבדיקת חסימות
CREATE OR ALTER FUNCTION dbo.IsUserBlocked
(
    @UserID1 INT,
    @UserID2 INT
)
RETURNS BIT
AS
BEGIN
    IF EXISTS (
        SELECT 1 FROM dbo.UserBlocks
        WHERE (UserID = @UserID1 AND BlockedUserID = @UserID2)
           OR (UserID = @UserID2 AND BlockedUserID = @UserID1)
    )
        RETURN 1;
    RETURN 0;
END
GO


INSERT INTO dbo.Users (Email, UserPassword, ProfileImage)
VALUES 
('user1@test.com', '123', NULL),
('user2@test.com', '123', NULL),
('user3@test.com', '123', NULL);

SELECT UserID, Email, UserPassword FROM dbo.Users;

DELETE FROM dbo.Users
WHERE Email LIKE 'user%@test.com';
GO

--התחברות או הרשמה עם גוגל
CREATE OR ALTER PROCEDURE dbo.AddOrGetGoogleUser
    @Email NVARCHAR(120),
    @ProfileImage NVARCHAR(255) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @UserID INT;

    -- אם המשתמש כבר קיים → נחזיר אותו
    SELECT @UserID = UserID
    FROM dbo.Users
    WHERE Email = @Email;

    IF @UserID IS NOT NULL
    BEGIN
        SELECT @UserID AS UserID;
        RETURN;
    END

    -- אחרת ניצור משתמש חדש (בלי סיסמה!)
    INSERT INTO dbo.Users (Email, UserPassword, ProfileImage)
    VALUES (@Email, '', @ProfileImage);

    SELECT SCOPE_IDENTITY() AS UserID;
END
GO
USE MATCHINGAPP 
DELETE FROM Users;
SELECT * FROM Users


--שינוי השדה של התמונה
ALTER TABLE dbo.UserProfile
ADD ProfileImage NVARCHAR(255) NULL;
GO

ALTER TABLE dbo.Users
DROP COLUMN ProfileImage;
GO

SELECT name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.UserProfile');

ALTER TABLE dbo.UserProfile
DROP CONSTRAINT CK__UserProfi__Gende__4E88ABD4;

ALTER TABLE dbo.UserProfile
ADD CONSTRAINT CK_UserProfile_Gender
CHECK (Gender IN (N'זכר', N'נקבה', N'אחר') OR Gender IS NULL);

INSERT INTO dbo.Interests (InterestName) VALUES
('אקסטרים'),
('טבע'),
('תרבות'),
('קולינריה'),
('שופינג'),
('בטן גב'),
('מוזיקה'),
('מסיבות');

-- -
ALTER TABLE dbo.UserProfile
DROP CONSTRAINT CK_UserProfile_Gender;
GO

ALTER TABLE dbo.UserProfile
ADD CONSTRAINT CK_UserProfile_Gender
CHECK (Gender IN ('Male', 'Female', 'Other') OR Gender IS NULL);
GO