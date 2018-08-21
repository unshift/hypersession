import {
  SESSION_USER_DATA,
  HYPERSESSION_CLEAR,
  HYPERSESSION_TOGGLE,
  PANE_RECORD,
} from './constants'

function sendSessionData (data) {
  return (dispatch, getState) => {
    dispatch({
      type: SESSION_USER_DATA,
      data,
      effect () {
        // If no uid is passed, data is sent to the active session.
        const uid = getState().sessions.activeUid

        window.rpc.emit('data', { uid, data })
      }
    })
  }
}

export default (Terms, { React, notify }) => {
  return class extends React.Component {
    constructor (props, context) {
      super(props, context)
      this.terms = null
      this.onDecorated = this.onDecorated.bind(this)
    }

    onDecorated (terms) {
      this.terms = terms
      window.rpc.on('hypersession init', async (script) => {
        const term = this.terms.getActiveTerm()
        term.clear()
        notify('Recording', 'Recording terminal session.')
        store.dispatch({
          type: HYPERSESSION_CLEAR,
          effect () {
            const uid = store.getState().sessions.activeUid
            window.rpc.emit('hypersession clear', { command: HYPERSESSION_CLEAR, uid })
          }
        })

        if (script) {
          while (script.length) {
            let line = script.shift()
            let chars = line.split('')
            chars.push('\n')
            while (chars.length) {
              await new Promise((resolve, reject) => setTimeout(() => {
                store.dispatch(sendSessionData(chars.shift()))
                resolve()

              }, 200))
            }
          }
        }

      })
      window.rpc.on('hypersession process init', () => {
        notify('Processing', 'This may take a while...')
      })
      window.rpc.on('hypersession log', console.log.bind(console))

      this.terms.registerCommands({
        [PANE_RECORD]: e => {
          store.dispatch({
            type: HYPERSESSION_TOGGLE,
            effect () {
              const uid = store.getState().sessions.activeUid
              rpc.emit('hypersession toggle', { command: HYPERSESSION_TOGGLE, uid })
            }
          })
        }
      })

      if (this.props.onDecorated) {
        this.props.onDecorated(terms)
      }
    }

    render () {
      return (<Terms onDecorated={this.onDecorated} {...this.props} />)
    }
  }
}