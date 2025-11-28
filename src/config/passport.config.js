import GoogleStrategy from "passport-google-oauth20";

const Strategy = GoogleStrategy.Strategy;
const passport = (passport) => {
  passport.use(
    new Strategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/user/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails[0].value;
          const avatar = profile.photos[0].value;
          const googleId = profile.id;

          let user = await User.findOne({ where: { email } });

          if (!user) {
            user = await User.create({
              email,
              name: profile.displayName,
              avatar,
            });
          }

          await UserProvider.findOrCreate({
            where: { provider: "google", providerUserId: googleId },
            defaults: { userId: user.id },
          });

          return done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );

  // Tắt session → Passport vẫn chạy được
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => done(null, id));
};

export default passport;
