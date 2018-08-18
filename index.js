const FabricClient = require('fabric-client')

class Client {
  constructor() {
    this.client = FabricClient.loadFromConfig('connection-profile.yaml')
    this.caClient = null
  }

  async init() {
    await this.client.initCredentialStores()
    this.caClient = await this.client.getCertificateAuthority()
    const enrollment = await this.caClient.enroll({
      enrollmentID: 'admin',
      enrollmentSecret: 'adminpw',
      profile: 'tls'
    })
    const user = await this.client.createUser({
      username: 'admin',
      mspid: 'ASDOrgMSP',
      cryptoContent: {
        privateKeyPEM: enrollment.key.toBytes(),
        signedCertPEM: enrollment.certificate
      }
    })
    this.client.setUserContext(user)
    this.channel = this.client.getChannel('asdchannel')
  }

  async invoke(chaincodeId, fcn, args) {
    const txId = this.client.newTransactionID()
    const transaction = { txId, chaincodeId, fcn, args }
    const results = await this.channel.sendTransactionProposal(transaction)
    const [proposalResponses, proposal] = results
    return this.channel.sendTransaction({ proposalResponses, proposal })
  }

  async query(chaincodeId, fcn, args) {
    const peers = this.client.getPeersForOrg('ASDOrg')
    const randomPeerIndex = Math.round(Math.random() * 100) % peers.length
    const peer = peers[randomPeerIndex]
    const txId = this.client.newTransactionID()
    const result = await this.channel.queryByChaincode({ targets: [peer], txId, chaincodeId, fcn, args })
    return result && result.toString() && JSON.parse(result.toString())
  }
}

(async function test() {
  const client = new Client()
  await client.init()
  // await client.invoke('create', ['3333', 'efefefe'], 'user').then(console.log)
  await client.query('user', 'get', ['2']).then(console.log).catch(console.error)
})()
