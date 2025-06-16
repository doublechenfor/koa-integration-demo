const { createClient } = require('redis');

const clientDB = createClient({
    url: 'redis://127.0.0.1:6379'
});

console.log('redis', clientDB)

clientDB.on('connect', (info)=> {
    console.log(`redis connect started...${info}`)
})

clientDB.on('error', (err) => {
    console.log(`redis error occur, ${err}`)
})

clientDB.connect()
module.exports = clientDB