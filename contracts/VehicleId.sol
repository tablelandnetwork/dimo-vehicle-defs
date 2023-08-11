// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.10 <0.9.0;

import {ERC721A, IERC721A} from "erc721a/contracts/ERC721A.sol";
import {ERC721AQueryable} from "erc721a/contracts/extensions/ERC721AQueryable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {TablelandDeployments} from "@tableland/evm/contracts/utils/TablelandDeployments.sol";
import {TablelandController, TablelandPolicy} from "@tableland/evm/contracts/TablelandController.sol";
import {SQLHelpers} from "@tableland/evm/contracts/utils/SQLHelpers.sol";

contract VehicleId is ERC721A, ERC721AQueryable, AccessControl {
    // Role that can add new vehicle defs.
    bytes32 public constant VEHICLE_ADMIN_ROLE =
        keccak256("VEHICLE_ADMIN_ROLE");
    // Tableland table id.
    uint256 private _defsTableId;
    // Tableland table prefix.
    string private constant DEFS_PREFIX = "dimo_vehicle_defs";
    // Tableland table schema.
    string private constant DEFS_SCHEMA =
        "id integer primary key, device_type_id text, make text, make_token_id integer, oem_platform_name text, model text, year integer, metadata text, model_style text, model_sub_style text";
    // Row count of vehicle defs.
    uint256 private _numDefs = 0;
    // A mapping of vehicle ids to vehicle defs.
    mapping(uint256 => uint256) private _idDefs;
    // A URI used to reference off-chain table metadata.
    string private _baseURIString;

    constructor(string memory baseURI) ERC721A("VehicleId", "VID") {
        _defsTableId = TablelandDeployments.get().create(
            address(this),
            SQLHelpers.toCreateFromSchema(DEFS_SCHEMA, DEFS_PREFIX)
        );

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A());
        _grantRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A());

        _baseURIString = baseURI;
    }

    event VehicleDefCreated(uint256 id, bytes32 entry);

    function createVehicleDef(
        string memory deviceTypeId,
        string memory make,
        uint256 makeTokenId,
        string memory oemPlatformName,
        string memory model,
        uint256 year,
        string memory metadata,
        string memory modelStyle,
        string memory modelSubStyle
    ) external returns (uint256) {
        require(
            hasRole(VEHICLE_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );

        string memory vals = string.concat(
            SQLHelpers.quote(deviceTypeId),
            ",",
            SQLHelpers.quote(make),
            ",",
            Strings.toString(makeTokenId),
            ",",
            SQLHelpers.quote(oemPlatformName),
            ",",
            SQLHelpers.quote(model),
            ",",
            Strings.toString(year),
            ",",
            SQLHelpers.quote(metadata),
            ",",
            SQLHelpers.quote(modelStyle),
            ",",
            SQLHelpers.quote(modelSubStyle)
        );
        string memory stmt = SQLHelpers.toInsert(
            DEFS_PREFIX,
            _defsTableId,
            "device_type_id,make,make_token_id,oem_platform_name,model,year,metadata,model_style,model_sub_style",
            vals
        );
        TablelandDeployments.get().mutate(address(this), _defsTableId, stmt);

        _numDefs += 1;
        emit VehicleDefCreated(_numDefs, keccak256(abi.encodePacked(vals)));

        return _numDefs;
    }

    function numVehicleDefs() external view returns (uint256) {
        return _numDefs;
    }

    function getVehicleDefsTable() external view returns (string memory) {
        return SQLHelpers.toNameFromId(DEFS_PREFIX, _defsTableId);
    }

    event VehicleIdCreated(uint256 id, uint256 defId);

    function createVehicleId(
        uint256 defId
    ) external payable returns (uint256 vehicleId) {
        require(_numDefs > 0 && defId <= _numDefs, "defId does not exist");

        vehicleId = _nextTokenId();
        _safeMint(_msgSenderERC721A(), 1);

        _idDefs[vehicleId] = defId;

        emit VehicleIdCreated(vehicleId, defId);
    }

    function getVehicleIdDef(
        uint256 vehicleId
    ) external view returns (uint256) {
        require(_exists(vehicleId), "vehicleId does not exist");

        return _idDefs[vehicleId];
    }

    function setBaseURI(string memory baseURI) external {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, _msgSenderERC721A()),
            "unauthorized"
        );
        _baseURIString = baseURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseURIString;
    }

    function _startTokenId() internal pure override returns (uint256) {
        return 1;
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721A, IERC721A, AccessControl) returns (bool) {
        return
            ERC721A.supportsInterface(interfaceId) ||
            AccessControl.supportsInterface(interfaceId);
    }
}
