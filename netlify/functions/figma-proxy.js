// Optional: Proxy for Figma API if you want to hide the token server-side
// For now, the app uses direct Figma API calls from the client
// This function can be used in the future for security

const fetch = require('node-fetch');

exports.handler = async function (event) {
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders(), body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { token, endpoint } = JSON.parse(event.body);

        if (!token || !endpoint) {
            return {
                statusCode: 400,
                headers: corsHeaders(),
                body: JSON.stringify({ error: 'token and endpoint are required' })
            };
        }

        const response = await fetch(`https://api.figma.com/v1${endpoint}`, {
            headers: {
                'X-Figma-Token': token,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        return {
            statusCode: response.status,
            headers: corsHeaders(),
            body: JSON.stringify(data)
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers: corsHeaders(),
            body: JSON.stringify({ error: error.message })
        };
    }
};

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };
}
