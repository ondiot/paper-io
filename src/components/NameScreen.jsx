function NameScreen({
  name,
  setName,
  onContinue
}) {
  return (
    <section className="name-screen">
      <div className="name-card">
        <h1>PAPER.IO</h1>

        <p>
          Enter your name to continue
        </p>

        <input
          type="text"
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          placeholder="Your name"
          maxLength={20}
        />

        <button
          onClick={onContinue}
          disabled={!name.trim()}
        >
          Continue
        </button>
      </div>
    </section>
  );
}

export default NameScreen;