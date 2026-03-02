module.exports.parseMessage = (data) => {
    try {
        return JSON.parse(data.toString());
    } catch (error) {
        return null;
    }
};