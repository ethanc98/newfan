const artists = document.querySelector('.artists');



for (let i = 0; i < 10; i++) {
    // artists.innerHTML += `<div class="artist-${i+1}"><button class="btn btn${i}" value="${i}">${fm.artist[i].name}</button></div>`
    artists.innerHTML += `<div class="artist artist-${i+1}">
    <form action="/gigs" method="POST">
    <input type="hidden" value="${fm.artist[i].mbid}" name="artistMbid">

    <button>${fm.artist[i].name}</button>

    </form>
    </div>`
}