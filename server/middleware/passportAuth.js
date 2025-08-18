import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import userServices from '../api/services/user';
import commonFunction from '../helper/utils';

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URL,
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
},
    async (accessToken, refreshToken, profile, cb) => {
        try {
            let user = await userServices.find({ OR: [{ googleId: profile.id }, { email: profile.emails[0].value, }] });
            if (user) {
                user = await userServices.update(
                    { id: user.id },
                    {
                        email: profile.emails[0].value,
                        isEmailVerified: profile.emails[0].verified ? "true" : "false",
                        isGoogleVerified: profile.emails[0].verified ? "true" : "false",
                        googleDisplayName: profile.displayName,
                        googleAccessToken: accessToken,
                        googleRefreshToken: refreshToken
                    })

                return cb(null, user);
            } else {
                const newUser = {
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    isEmailVerified: profile.emails[0].verified ? "true" : "false",
                    isGoogleVerified: profile.emails[0].verified ? "true" : "false",
                    firstName: profile.name.givenName,
                    lastName: profile.name.familyName,
                    googleDisplayName: profile.displayName,
                    googleAccessToken: accessToken,
                    googleRefreshToken: refreshToken,
                    referralCode: await commonFunction.generateRandomCode(8)
                };
                user = await userServices.create(newUser);
                return cb(null, user);
            }
        } catch (err) {
            return cb(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.googleId);
});

passport.deserializeUser(async (googleId, done) => {
    try {
        let user = await userServices.find({ googleId: googleId });
        done(null, user);
    } catch (err) {
        done(err);
    }
});

export default passport;
