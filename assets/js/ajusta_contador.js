const { updateOsNumberCounter, connectDB, disconnectDB } = require('../../utils/db');

(async () => {
    await connectDB();
    await updateOsNumberCounter();
    await disconnectDB();
    process.exit(0);
})();