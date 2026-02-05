async function testSearch() {
    try {
        console.log("Searching for 'Nike'...");
        const res = await fetch('http://localhost:8080/api/public/search?q=Nike');
        console.log("Search Status:", res.status);
        const data = await res.json();
        console.log("Results found:", data.length);
        if (data.length > 0) {
            console.log("First result:", data[0].name);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

testSearch();
