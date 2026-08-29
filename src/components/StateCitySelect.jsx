import STATE_CITY_MAP from '../lib/indiaStatesCities.json'

const STATES = Object.keys(STATE_CITY_MAP).sort()

export default function StateCitySelect({ state, city, onStateChange, onCityChange }) {
  const cities = state ? STATE_CITY_MAP[state] || [] : []

  function handleStateChange(e) {
    const nextState = e.target.value
    onStateChange(nextState)
    onCityChange('') // city no longer valid for the new state
  }

  return (
    <div className="flex gap-3">
      <select
        className="input-field"
        value={state}
        onChange={handleStateChange}
      >
        <option value="">State *</option>
        {STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        className="input-field disabled:cursor-not-allowed disabled:opacity-60"
        value={city}
        onChange={(e) => onCityChange(e.target.value)}
        disabled={!state}
      >
        <option value="">{state ? 'City *' : 'Select a state first'}</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  )
}
