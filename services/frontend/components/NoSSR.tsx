import React from 'react'

const NoSSR = (props: { children: React.ReactNode }) => (
  <React.Fragment>{props.children}</React.Fragment>
)

export default NoSSR;