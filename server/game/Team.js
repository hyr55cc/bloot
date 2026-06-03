class Team {
    constructor(id, players) {
        this.id = id;
        this.players = players;
        this.score = 0;
        this.roundScore = 0;
        this.tricks = [];
        this.projects = [];
    }

    addTrick(trick) {
        this.tricks.push(trick);
    }

    addProject(project) {
        this.projects.push(project);
    }

    addScore(points) {
        this.score += points;
        this.roundScore += points;
    }

    resetRound() {
        this.roundScore = 0;
        this.tricks = [];
        this.projects = [];
    }

    getTotalPoints() {
        return this.tricks.reduce((sum, trick) => 
            sum + trick.reduce((s, {card}) => s + card.value, 0), 0
        );
    }

    toJSON() {
        return {
            id: this.id,
            score: this.score,
            roundScore: this.roundScore,
            tricksCount: this.tricks.length,
            players: this.players.map(p => p.id)
        };
    }
}

module.exports = Team;