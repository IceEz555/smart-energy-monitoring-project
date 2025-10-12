const { graphql, buildSchema } = require('graphql');
const { usageData } = require('./resolvers/usageData');
const { realtime } = require('./resolvers/realtime');
const { stats } = require('./resolvers/stats');
const { readings } = require('./resolvers/readings');
const { listDevices } = require('./resolvers/listDevices');

const schema = buildSchema(`
  type Query {
    listDevices: [String!]!
    usageData(startDate: Int!, endDate: Int!, deviceId: String!): [DailySummary]!
    stats(deviceId: String!): Stats!
    realtime(sinceTimestamp: Int!, deviceId: String!): [Reading]!
    readings(startDate: Int!, endDate: Int!, deviceId: String!): [Reading]!
  }
  type Stats {
    always_on: Float
    today_so_far: Float
  }
  type Reading {
    timestamp: Int!
    reading: Int!
  }
  type DailySummary {
    timestamp: Int!
    dayUse: Float!
    nightUse: Float!
  }
`);

// *** FIX: rootValue ต้องเป็น Object ที่มี key ตรงกับ Query name ***
const rootValue = {
    listDevices: listDevices,
    usageData: usageData,
    realtime: realtime,
    stats: stats,
    readings: readings
};

module.exports.handler = async (event) => {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Request body is empty' })
            };
        }

        const body = JSON.parse(event.body);


        if (!body.query) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'GraphQL query is missing' })
            };
        }

        const result = await graphql({
            schema: schema,
            source: body.query,
            rootValue: rootValue, // ใช้ rootValue ที่ถูกต้อง
            variableValues: body.variables || {}
        });

        // Log errors for debugging
        if (result.errors) {
            console.error('GraphQL Errors:', JSON.stringify(result.errors, null, 2));
        }

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': true
            },
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Handler Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                error: error.message
            })
        };
    }
};