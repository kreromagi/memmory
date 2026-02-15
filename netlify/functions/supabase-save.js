// Optional: Server-side Supabase operations
// Currently the app uses direct Supabase calls from the client via anon key

exports.handler = async function (event) {
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Supabase save endpoint ready' })
    };
};
