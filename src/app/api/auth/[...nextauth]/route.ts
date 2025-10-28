import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId:
                "769194724120-0rqp994k8u5cccarom9kk9f6tl8ekqol.apps.googleusercontent.com",
            clientSecret: "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",
        }),
    ],
    secret:
        "e07c9718e31032c63e5f3c4df7f632a94bb580e1460ae096c958e9372b9f8ce5", // your NEXTAUTH_SECRET
});

export { handler as GET, handler as POST };




// import NextAuth from "next-auth";
// import GoogleProvider from "next-auth/providers/google";
//
// const handler = NextAuth({
//     providers: [
//         GoogleProvider({
//             clientId: process.env.GOOGLE_CLIENT_ID!,
//             clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//         }),
//     ],
//     secret: process.env.NEXTAUTH_SECRET,
// });
//
// export { handler as GET, handler as POST };
