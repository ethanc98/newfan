const artist = document.querySelector('.artist');
const gigs = document.querySelector('.gigs');


for (let i = 0; i < fm.setlist.length; i++) {
    gigs.innerHTML += `<div class="set set-${i+1}"><button class="btn set__btn btn${i}" value="${i}">${fm.setlist[i].venue.name}, ${fm.setlist[i].venue.city.name}, ${fm.setlist[i].venue.city.state} ${fm.setlist[i].eventDate.replace(/-/g,' ')}</button></div>`
}
    

gigs.onclick = async (e) => {
    if (e.target.tagName !== 'BUTTON') {
        return;
    }
    const target = e.target.value;
    console.log(fm.setlist[target].sets.set[0].song);

    localStorage.setItem('setlistNum', target);
    localStorage.setItem('gig', JSON.stringify(fm.setlist[target].sets.set[0].song));
    localStorage.setItem('artist', fm.setlist[target].artist.name);
    localStorage.setItem('date', fm.setlist[target].eventDate);
    localStorage.setItem('place', `${fm.setlist[target].venue.name}, ${fm.setlist[target].venue.city.name}, ${fm.setlist[target].venue.city.state}`);
    window.location.assign('/setlist');
};